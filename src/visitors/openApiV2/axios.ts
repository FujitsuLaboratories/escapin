import { OpenAPIV2 } from 'openapi-types';
import { BaseState } from '../../state';
import * as u from '../../util';
import { HttpMethod } from '../../types';
import { createOptions } from './httpRequest';
import { EscapinSyntaxError } from '../../error';

export default function (
  method: HttpMethod,
  key: u.Identifier,
  spec: OpenAPIV2.Document,
  state: BaseState,
  path: u.NodePath,
  target: u.NodePath,
  data?: u.Node,
): void {
  const req = createOptions(method, key, spec, path, target, state);

  const variable = path.scope.generateUidIdentifier(method);
  const response = path.scope.generateUidIdentifier('res');

  const stmtPath = path.findParent(path => path.isStatement());
  const vars = {
    $RES: response,
    $URI: u.parseExpression(`\`${req.uri}\``),
    $HEADER: req.header,
    $QUERY: req.query,
  };
  if (data) {
    switch (req.contentType) {
      case 'multipart/form-data':
        {
          if (!u.isObjectExpression(data)) {
            break;
          }
          const params = path.scope.generateUidIdentifier('params');
          stmtPath.insertBefore(
            u.statement('const $PARAMS = new FormData();', {
              $PARAMS: params,
            }),
          );
          for (const prop of data.properties) {
            if (!u.isObjectProperty(prop)) {
              continue;
            }
            stmtPath.insertBefore(
              u.statement('$PARAMS.append($KEY, $VALUE);', {
                $PARAMS: params,
                $KEY: u.isStringLiteral(prop.key)
                  ? prop.key
                  : u.stringLiteral(prop.key.name),
                $VALUE: prop.value,
              }),
            );
          }
          req.header.properties.push(
            u.spreadElement(
              u.expression('$PARAMS.getHeaders()', {
                $PARAMS: params,
              }),
            ),
          );
          vars['$DATA'] = params;
        }
        break;
      case 'application/x-www-form-urlencoded':
        {
          if (!u.isObjectExpression(data)) {
            break;
          }
          const params = path.scope.generateUidIdentifier('params');
          stmtPath.insertBefore(
            u.statement('const $PARAMS = new URLSearchParams();', {
              $PARAMS: params,
            }),
          );
          for (const prop of data.properties) {
            if (!u.isObjectProperty(prop)) {
              continue;
            }
            stmtPath.insertBefore(
              u.statement('$PARAMS.append($KEY, $VALUE);', {
                $PARAMS: params,
                $KEY: u.isStringLiteral(prop.key)
                  ? prop.key
                  : u.stringLiteral(prop.key.name),
                $VALUE: prop.value,
              }),
            );
          }
          vars['$DATA'] = params;
        }
        break;
      case 'application/json':
      default:
        vars['$DATA'] = data;
        break;
    }
  }
  try {
    const clientStmt = u.snippetFor(
      `axios.${method}`,
      vars,
    )[0] as u.VariableDeclaration;

    if (method === 'delete') {
      stmtPath.replaceWith(clientStmt);
      return;
    }

    const letSnippet = u.statement('let $VAR = $RES.data;', {
      $RES: response,
      $VAR: variable,
    });

    const assignmentSnippet = u.statement('$VAR = $RES.data;', {
      $RES: response,
      $VAR: variable,
    });

    if (
      stmtPath.isExpressionStatement() &&
      u.equals(stmtPath.node.expression, req.targetNodePath.node)
    ) {
      stmtPath.replaceWith(
        u.expressionStatement(clientStmt.declarations[0].init as u.Expression),
      );
    } else if (stmtPath.isWhileStatement()) {
      stmtPath.insertBefore(clientStmt);
      stmtPath.insertBefore(letSnippet);
      const block = stmtPath.node.body as u.BlockStatement;
      block.body = [...block.body, clientStmt, assignmentSnippet];
    } else if (stmtPath.isDoWhileStatement()) {
      stmtPath.insertBefore(u.statement('let $VAR;', { $VAR: variable }));
      const block = stmtPath.node.body as u.BlockStatement;
      block.body = [...block.body, clientStmt, assignmentSnippet];
    } else {
      stmtPath.insertBefore(clientStmt);
      stmtPath.insertBefore(letSnippet);
    }
    u.replace<u.Node>(stmtPath, req.targetNodePath.node, variable);
  } catch (err) {
    new EscapinSyntaxError(err.toString(), stmtPath.node, state);
  }
}
