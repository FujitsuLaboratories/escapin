import { Visitor } from '@babel/traverse';
import { isEqual } from 'lodash';
import { OpenAPIV2 } from 'openapi-types';
import Path from 'path';
import * as u from '../util';
import { EscapinSyntaxError } from '../error';
import { BaseState } from '../state';

const visitor: Visitor<BaseState> = {
  Function(path, state) {
    const func = path.node;
    const stmtPath = path.isExpression() ? path.findParent(path => path.isStatement()) : path;
    const id = u.getFunctionId(stmtPath, func);
    if (id === undefined) {
      return;
    }
    const { name } = id;

    const { params } = func;
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

    path.traverse(functionVisitor(func, firstParam, parametersWithoutRefs), state);

    const body = func.body as u.BlockStatement;

    body.body = [
      u.statement('try { $BODY } catch (err) { callback(new Error(`[500] ${err.toString()}`)); }', {
        $BODY: body.body,
      }),
    ];

    if (info.consumes && info.consumes.some(consumes => consumes === 'multipart/form-data')) {
      body.body.unshift(u.statement('$PARAM = parseMultipart($PARAM);', { $PARAM: firstParam }));
      stmtPath.insertBefore(u.snippetFor('misc.multipart'));
    }
  },
};

type FirstParameter =
  | u.ArrayPattern
  | u.AssignmentPattern
  | u.Identifier
  | u.RestElement
  | u.ObjectPattern
  | u.TSParameterProperty;

function functionVisitor(
  func: u.Function,
  firstParam: FirstParameter,
  params: OpenAPIV2.Parameter[],
): Visitor<BaseState> {
  return {
    VariableDeclarator(path, state): void {
      const { node } = path;
      const { id, init } = node;
      if (!u.isObjectPattern(id) || !u.isMemberExpression(init)) {
        return;
      }
      const { object, property } = init;
      if (!isEqual(object, firstParam) || !u.isIdentifier(property)) {
        return;
      }
      for (const prop of id.properties) {
        if (!u.isObjectProperty(prop)) {
          continue;
        }
        const param = params.find(param => param.name === prop.key.name);
        if (param === undefined) {
          throw new Error(`Parameter "${prop.key.name}" does not exist.`);
        }
        if (param.in !== property.name) {
          throw new EscapinSyntaxError(
            `Wrong parameter access "${u.generate(init)}.${
              param.name
            }". The correct parameter access is "${u.generate(firstParam)}.${param.in}.${
              param.name
            }"`,
            init,
            state,
          );
        }
      }
    },
    MemberExpression(path, state): void {
      const { node } = path;
      if (!u.isMemberExpression(node.object)) {
        return;
      }
      const { object, property } = node.object;
      if (!isEqual(object, firstParam) || !u.isIdentifier(property)) {
        return;
      }
      if (!['query', 'path', 'header', 'body', 'formData'].includes(property.name)) {
        throw new EscapinSyntaxError(
          `Invalid request parameter access. Property names of "req" should be either "query", "path", "header", "body" or "formData"`,
          property,
          state,
        );
      }
      const param = params.find(param => param.name === property.name);
      if (param === undefined) {
        throw new EscapinSyntaxError(
          `Parameter "${property.name}" does not exist.`,
          property,
          state,
        );
      }
      if (param.in !== property.name) {
        throw new EscapinSyntaxError(
          `Wrong parameter access "${u.generate(
            node,
          )}". The correct parameter access is "${u.generate(firstParam)}.${param.in}.${
            param.name
          }"`,
          node,
          state,
        );
      }
    },
    ReturnStatement(path): void {
      if (path.node.argument !== null) {
        path.insertBefore(u.statement('callback(null, $ARG);', { $ARG: path.node.argument }));
        path.node.argument = null;
      }
    },
    ThrowStatement(path): void {
      if (path.findParent(path => path.isTryStatement())) {
        path.skip();
        return;
      }
      path.insertBefore(u.statement('callback($ARG);', { $ARG: path.node.argument }));
      path.replaceWith(u.returnStatement());
    },
  };
}

export default visitor;
