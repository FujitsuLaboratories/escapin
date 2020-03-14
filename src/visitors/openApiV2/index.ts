import { Visitor } from '@babel/traverse';
import { OpenAPIV2 } from 'openapi-types';
import { EscapinSyntaxError } from '../../error';
import { BaseState } from '../../state';
import * as u from '../../util';
import { loadOpenApiV2 } from './load';
import { createRequestOptions } from './requestOptions';

const visitor: Visitor<BaseState> = {
  ImportDeclaration(path, state) {
    if (path.node.specifiers.length !== 1) {
      return;
    }
    const firstSpecifier = path.node.specifiers[0];
    if (!u.isImportDefaultSpecifier(firstSpecifier)) {
      return;
    }

    try {
      const uri = path.node.source.value;
      const spec = loadOpenApiV2(uri, state);
      if (spec === null) {
        path.skip();
        return;
      }

      if (!u.isOpenAPIV2Document(spec)) {
        throw new Error('This API specification does not conform to OAS V2');
      }

      const { local } = firstSpecifier;
      if (local) {
        u.traverse(apiVisitor(local, spec), state);
        state.addDependency('request');
      }
      path.remove();
    } catch (err) {
      throw new EscapinSyntaxError(err, path.node, state);
    }
  },
};

function apiVisitor(key: u.Identifier, spec: OpenAPIV2.Document): Visitor<BaseState> {
  function keyIncluded(path: u.NodePath, key: u.Identifier): boolean {
    return u.test(path, path => path.isMemberExpression() && u.equals(path.node.object, key));
  }
  return {
    MemberExpression(path, state): void {
      // GET
      if (!keyIncluded(path, key)) {
        return;
      }

      const { options, target } = createRequestOptions('GET', key, spec, path, state);

      modifySnippets('get', path, target, options);
      path.skip();
    },
    CallExpression(path, state): void {
      // POST
      const callee = path.get('callee');
      const arg0 = path.node.arguments[0];
      if (
        !keyIncluded(callee, key) ||
        u.isArgumentPlaceholder(arg0) ||
        u.isJSXNamespacedName(arg0)
      ) {
        return;
      }
      const { options, bodyParameter } = createRequestOptions('POST', key, spec, callee, state);

      if (u.isSpreadElement(arg0)) {
        options.properties.unshift(arg0);
      } else {
        options.properties.unshift(u.objectProperty(u.identifier(bodyParameter), arg0));
      }

      modifySnippets('post', path, path, options);
      path.skip();
    },
    AssignmentExpression(path, state): void {
      // PUT
      const left = path.get('left');
      if (!keyIncluded(left, key)) {
        return;
      }
      const { options, bodyParameter } = createRequestOptions('PUT', key, spec, left, state);

      options.properties.unshift(
        u.objectProperty(
          u.identifier(bodyParameter),
          u.expression('JSON.stringify($BODY)', {
            $BODY: path.node.right,
          }),
        ),
      );

      modifySnippets('put', path, path, options);
      path.skip();
    },
    UnaryExpression(path, state): void {
      // DELETE
      const argument = path.get('argument');
      if (!keyIncluded(argument, key) || path.node.operator !== 'delete') {
        return;
      }
      const { options } = createRequestOptions('DELETE', key, spec, argument, state);

      const stmtPath = path.findParent(path => path.isStatement());
      stmtPath.replaceWith(
        u.statement('const { $RES, $BODY } = request($OPTIONS);', {
          $BODY: path.scope.generateUidIdentifier('body'),
          $OPTIONS: options,
          $RES: path.scope.generateUidIdentifier('res'),
        }),
      );
      path.skip();
    },
  };
}

function modifySnippets(
  method: string,
  path: u.NodePath,
  target: u.NodePath,
  options: u.ObjectExpression,
): void {
  const variable = path.scope.generateUidIdentifier(method);

  const letSnippet = u.statements('const { $RES, $BODY } = request($OPTIONS); let $VAR = $BODY', {
    $BODY: path.scope.generateUidIdentifier('body'),
    $OPTIONS: options,
    $RES: path.scope.generateUidIdentifier('res'),
    $VAR: variable,
  });

  const assignmentSnippet = u.statements(
    'const { $RES, $BODY } = request($OPTIONS); $VAR = $BODY',
    {
      $BODY: path.scope.generateUidIdentifier('body'),
      $OPTIONS: options,
      $RES: path.scope.generateUidIdentifier('res'),
      $VAR: variable,
    },
  );

  const stmtPath = path.findParent(path => path.isStatement());
  if (stmtPath.isExpressionStatement() && u.equals(stmtPath.node.expression, target.node)) {
    stmtPath.replaceWith(letSnippet[0]);
  } else if (stmtPath.isWhileStatement()) {
    stmtPath.insertBefore(letSnippet);
    const block = stmtPath.node.body as u.BlockStatement;
    block.body = [...block.body, ...assignmentSnippet];
  } else if (stmtPath.isDoWhileStatement()) {
    stmtPath.insertBefore(u.statement('let $VAR;', { $VAR: variable }));
    const block = stmtPath.node.body as u.BlockStatement;
    block.body = [...block.body, ...assignmentSnippet];
  } else {
    stmtPath.insertBefore(letSnippet);
  }
  u.replace(stmtPath, target.node, variable);
}

export default visitor;
