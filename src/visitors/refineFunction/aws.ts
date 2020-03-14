import { Visitor } from '@babel/traverse';
import { isEqual } from 'lodash';
import { OpenAPIV2 } from 'openapi-types';
import { EscapinSyntaxError } from '../../error';
import { BaseState } from '../../state';
import { PathInfo } from '../../types';
import * as u from '../../util';

export default function(
  stmtPath: u.NodePath,
  func: u.Function,
  info: PathInfo,
): Visitor<BaseState> {
  const { params } = func;
  const firstParam = params[0];
  const parameters = info.parameters.filter(param => !('name' in param)) as OpenAPIV2.Parameter[];

  return {
    Function(path): void {
      if (path.node !== func) {
        path.skip();
        return;
      }

      const { params } = func;
      params.push(u.identifier('context'));
      params.push(u.identifier('callback'));

      const body = func.body as u.BlockStatement;

      body.body = [
        u.statement(
          'try { $BODY } catch (err) { callback(new Error(`[500] ${err.toString()}`)); }',
          {
            $BODY: body.body,
          },
        ),
      ];

      if (info.consumes && info.consumes.some(consumes => consumes === 'multipart/form-data')) {
        body.body.unshift(u.statement('$PARAM = parseMultipart($PARAM);', { $PARAM: firstParam }));
        stmtPath.insertBefore(u.snippetFor('misc.multipart'));
      }
    },
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
        const param = parameters.find(param => param.name === prop.key.name);
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
      const param = parameters.find(param => param.name === property.name);
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
