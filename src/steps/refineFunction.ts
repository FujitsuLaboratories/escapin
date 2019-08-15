import { Visitor } from '@babel/traverse';
import { isEqual } from 'lodash';
import { OpenAPIV2 } from 'openapi-types';
import Path from 'path';
import { Escapin } from '..';
import * as u from '../util';
import { SyntaxError } from '../error';
import { BaseState } from '../state';

export default function(escapin: Escapin) {
  console.log('refineFunction');
  for (const filename in escapin.states) {
    u.traverse(visitor, new FunctionState(escapin.states[filename]));
  }
}

class FunctionState extends BaseState {
  constructor(base?: BaseState) {
    super(base);
    this.functions = [];
  }
  public functions: u.Function[];
}

const visitor: Visitor<FunctionState> = {
  Function(path, state) {
    const func = path.node;
    const stmtPath = path.isExpression() ? path.findParent(path => path.isStatement()) : path;
    const id = u.getFunctionId(stmtPath, func);
    if (id === undefined) {
      return;
    }
    const name = id.name;

    const { params } = func;
    const req = params[0];
    if (state.functions.includes(path.node)) {
      return;
    }
    const info = state.getPathInfo(name);
    if (info === undefined) {
      return;
    }

    const handler = `${Path.basename(state.filename, Path.extname(state.filename))}.${name}`;

    const { parameters } = info;
    const { platform } = state.escapin.config;

    state.escapin.addServerlessConfig(`${platform}.function`, {
      name,
      handler,
    });
    state.escapin.addServerlessConfig(`${platform}.function.http`, {
      name,
      path: info.path.substring(1),
      method: info.method,
    });

    const firstParam = params[0];
    params.push(u.identifier('context'));
    params.push(u.identifier('callback'));

    const parametersWithoutRefs = parameters.filter(
      param => !('name' in param),
    ) as OpenAPIV2.Parameter[];

    path.traverse({
      VariableDeclarator(path) {
        const { node } = path;
        const { id, init } = node;
        if (u.isObjectPattern(id) && u.isMemberExpression(init)) {
          const { object, property } = init;
          if (isEqual(object, req) && u.isIdentifier(property)) {
            for (const prop of id.properties) {
              if (!u.isObjectProperty(prop)) {
                continue;
              }
              const param = parametersWithoutRefs.find(param => param.name === prop.key.name);
              if (param === undefined) {
                throw new Error(`Parameter "${prop.key.name}" does not exist.`);
              }
              if (param.in !== property.name) {
                throw new SyntaxError(
                  `Wrong parameter access "${u.generate(init)}.${
                    param.name
                  }". The correct parameter access is "${u.generate(req)}.${param.in}.${
                    param.name
                  }"`,
                  init,
                  state,
                );
              }
            }
          }
        }
      },
      MemberExpression(path) {
        const { node } = path;
        const { object, property } = node;
        if (u.isMemberExpression(object)) {
          const { object: object2, property: property2 } = object;
          if (isEqual(object2, req) && u.isIdentifier(property)) {
            if (!['query', 'path', 'header', 'body', 'formData'].includes(property2.name)) {
              throw new SyntaxError(
                `Invalid request parameter access. Property names of "req" should be either "query", "path", "header", "body" or "formData"`,
                property2,
                state,
              );
            }
            const param = parametersWithoutRefs.find(param => param.name === property.name);
            if (param === undefined) {
              throw new SyntaxError(
                `Parameter "${property.name}" does not exist.`,
                property,
                state,
              );
            }
            if (param.in !== property.name) {
              throw new SyntaxError(
                `Wrong parameter access "${u.generate(
                  node,
                )}". The correct parameter access is "${u.generate(req)}.${param.in}.${
                  param.name
                }"`,
                node,
                state,
              );
            }
          }
        }
      },
      ReturnStatement(path) {
        if (path.node.argument !== null) {
          path.insertBefore(u.statement('callback(null, $ARG);', { $ARG: path.node.argument }));
          path.node.argument = null;
        }
      },
      ThrowStatement(path) {
        if (path.findParent(path => path.isTryStatement())) {
          path.skip();
          return;
        }
        path.insertBefore(u.statement('callback($ARG);', { $ARG: path.node.argument }));
        path.replaceWith(u.returnStatement());
      },
      Function(path) {
        if (path.node !== func) {
          path.stop();
        }
      },
    });

    const body = func.body as u.BlockStatement;

    body.body = [
      u.statement('try { $BODY } catch (err) { callback(new Error(`500: ${err}`)); }', {
        $BODY: body.body,
      }),
    ];

    if (info.consumes && info.consumes.some(consumes => consumes === 'multipart/form-data')) {
      body.body.unshift(u.statement('$PARAM = parseMultipart($PARAM);', { $PARAM: firstParam }));
      stmtPath.insertBefore(u.snippetFor('misc.multipart'));
    }
  },
};
