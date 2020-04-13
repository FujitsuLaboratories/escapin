import { OpenAPIV2 } from 'openapi-types';
import { BaseState } from '../../state';
import { HttpMethod } from '../../types';
import * as u from '../../util';
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

  const options = u.objectExpression([
    u.objectProperty(u.identifier('uri'), u.parseExpression(`\`${req.uri}\``)),
    u.objectProperty(u.identifier('method'), u.stringLiteral(method)),
  ]);

  if (req.header.properties.length > 0) {
    options.properties.push(
      u.objectProperty(u.identifier('headers'), req.header),
    );
  }
  if (req.query.properties.length > 0) {
    options.properties.push(u.objectProperty(u.identifier('qs'), req.query));
  }

  if (data) {
    options.properties.push(
      u.objectProperty(
        u.identifier('contentType'),
        u.stringLiteral(req.contentType),
      ),
    );

    const bodyParameter = getBodyParameter(req.contentType);
    if (bodyParameter === 'body') {
      options.properties.push(
        u.objectProperty(u.identifier('json'), u.booleanLiteral(true)),
      );
    }
    switch (method) {
      case 'post':
        if (u.isSpreadElement(data)) {
          options.properties.unshift(data);
        } else {
          options.properties.unshift(
            u.objectProperty(
              u.identifier(bodyParameter),
              data as u.Expression | u.PatternLike,
            ),
          );
        }
        break;
      case 'put':
        options.properties.unshift(
          u.objectProperty(
            u.identifier(bodyParameter),
            u.expression('JSON.stringify($BODY)', {
              $BODY: data,
            }),
          ),
        );
        break;
      default:
        break;
    }
  }

  const variable = path.scope.generateUidIdentifier(method);
  const response = path.scope.generateUidIdentifier('res');
  const body = path.scope.generateUidIdentifier('body');

  const stmtPath = path.findParent(path => path.isStatement());
  try {
    const stmts = u.snippetFor(`request.request`, {
      $RES: response,
      $BODY: body,
      $OPTIONS: options,
    });

    if (method === 'delete') {
      stmtPath.replaceWithMultiple(stmts);
      return;
    }

    const letSnippet = u.statement('let $VAR = $BODY', {
      $VAR: variable,
      $BODY: body,
    });

    const assignmentSnippet = u.statement('$VAR = $BODY', {
      $VAR: variable,
      $BODY: body,
    });
    if (
      stmtPath.isExpressionStatement() &&
      u.equals(stmtPath.node.expression, req.targetNodePath.node)
    ) {
      stmtPath.replaceWithMultiple(stmts);
    } else if (stmtPath.isWhileStatement()) {
      stmtPath.insertBefore(stmts);
      stmtPath.insertBefore(letSnippet);
      const block = stmtPath.node.body as u.BlockStatement;
      block.body = [...block.body, ...stmts, assignmentSnippet];
    } else if (stmtPath.isDoWhileStatement()) {
      stmtPath.insertBefore(u.statement('let $VAR;', { $VAR: variable }));
      const block = stmtPath.node.body as u.BlockStatement;
      block.body = [...block.body, ...stmts, assignmentSnippet];
    } else {
      stmtPath.insertBefore(stmts);
      stmtPath.insertBefore(letSnippet);
    }
    u.replace<u.Node>(stmtPath, req.targetNodePath.node, variable);
  } catch (err) {
    throw new EscapinSyntaxError(err.toString(), stmtPath.node, state);
  }
}

function getBodyParameter(contentType: string): string {
  switch (contentType) {
    case 'multipart/form-data':
      return 'formData';
    case 'application/x-www-form-urlencoded':
      return 'form';
    case 'application/json':
    default:
      return 'body';
  }
}
