/* eslint-disable @typescript-eslint/camelcase */
import { Visitor } from '@babel/traverse';
import { cloneDeep } from 'lodash';
import Path from 'path';
import { EscapinSyntaxError } from '../../error';
import { BaseState } from '../../state';
import * as u from '../../util';
import { fetchObjectKeys } from './objectKeys';

const visitor: Visitor<BaseState> = {
  ExportNamedDeclaration(path, state) {
    const { declaration } = path.node;
    if (!u.isVariableDeclaration(declaration)) {
      return;
    }
    const firstDeclarator = declaration.declarations[0];
    const { id, init } = firstDeclarator;
    if (
      !u.isIdentifier(id) ||
      !u.isObjectExpression(init) ||
      init.properties.length > 0
    ) {
      return;
    }

    const { default_storage, platform } = state.escapin.config;
    let service = default_storage;
    if (
      u.isTSTypeAnnotation(id.typeAnnotation) &&
      u.isTSTypeReference(id.typeAnnotation.typeAnnotation)
    ) {
      const { typeName } = id.typeAnnotation.typeAnnotation;
      service = u.getTypeName(typeName);
    }

    if (!service.startsWith(`${platform}.`)) {
      service = `${platform}.${service}`;
    }

    try {
      state.unshiftProgramBody(u.snippetFor(service));
    } catch (err) {
      throw new EscapinSyntaxError(err.message, id, state);
    }

    state.escapin.addServerlessConfig(service, {
      name: id.name,
      id: state.escapin.id,
    });

    u.traverse(objectVisitor(id, service), state);

    path.remove();
  },
};

function objectVisitor(id: u.Identifier, service: string): Visitor<BaseState> {
  const assignments: Array<{
    left: u.MemberExpression;
    right: u.Expression;
    variable: u.Identifier;
    snippet: u.Node;
    service: string;
  }> = [];
  return {
    MemberExpression(path, state): void {
      const { node } = path;
      const { object, property } = node;
      if (!u.equals(id, object)) {
        return;
      }
      const replacement = u.reuseReplacement(path, state, node);
      if (replacement !== undefined) {
        console.log(
          `replacing ${u.generate(node)} with ${u.generate(
            replacement.replaced,
          )}`,
        );
        u.replace(path, node, replacement.replaced);
        return;
      }

      const variable = path.scope.generateUidIdentifier(id.name);

      const vars = {
        $NAME: u.stringLiteral(`${id.name}-${state.escapin.id}`),
        $KEY: property,
        $VAR: variable,
        $TEMPVAR: path.scope.generateUidIdentifier('temp'),
      };

      const letSnippet = u.snippetFor(`${service}.get_let`, vars);

      const assignmentSnippet = u.snippetFor(`${service}.get_assign`, vars);

      const stmtPath = path.findParent(path =>
        path.isStatement(),
      ) as u.NodePath<u.Statement>;
      if (stmtPath === null) {
        throw new Error(JSON.stringify(path.parent, null, 2));
      }
      if (
        stmtPath.isExpressionStatement() &&
        u.equals(stmtPath.node.expression, id)
      ) {
        stmtPath.replaceWithMultiple(letSnippet);
      } else if (stmtPath.isWhileStatement()) {
        stmtPath.insertBefore(letSnippet);
        const { body } = stmtPath.node;
        if (!u.isBlockStatement(body)) {
          stmtPath.node.body = u.blockStatement([body, ...assignmentSnippet]);
        } else {
          body.body.push(...assignmentSnippet);
        }
      } else if (stmtPath.isDoWhileStatement()) {
        stmtPath.insertBefore(u.statement('let $VAR;', { $VAR: variable }));
        const { body } = stmtPath.node;
        if (!u.isBlockStatement(body)) {
          stmtPath.node.body = u.blockStatement([body, ...assignmentSnippet]);
        } else {
          body.body.push(...assignmentSnippet);
        }
      } else {
        stmtPath.insertBefore(letSnippet);
      }
      u.replace<u.Statement>(stmtPath, node, variable);

      state.replacements.push({
        original: node,
        replaced: variable,
        scope: path.scope,
      });
      path.skip();
    },
    AssignmentExpression(path, state): void {
      const { left, right } = path.node;
      if (!u.isMemberExpression(left)) {
        return;
      }
      const { object } = left;
      if (!u.equals(id, object)) {
        return;
      }

      const variable = path.scope.generateUidIdentifier(id.name);
      const tempVar = path.scope.generateUidIdentifier('temp');

      const snippet = u.snippetFor(`${service}.put`, {
        $TEMPVAR: tempVar,
        $NAME: u.stringLiteral(`${id.name}-${state.escapin.id}`),
        $KEY: left.property,
        $VAR: variable,
        $VALUE: right,
      });

      const stmtPath = path.findParent(path => path.isStatement());
      stmtPath.replaceWithMultiple(snippet);

      state.replacements.push({
        original: left,
        replaced: variable,
        scope: path.scope,
      });

      assignments.push({
        left,
        right,
        variable,
        snippet: snippet[1],
        service,
      });
      path.skip();
    },
    VariableDeclaration(path, state): void {
      const assignment = assignments.find(that =>
        u.includes(path, that.snippet),
      );
      if (assignment === undefined) {
        return;
      }
      const { left, right, variable, service } = assignment;
      const { parentPath } = path;
      if (!u.isIdentifier(left.object)) {
        return;
      }

      u.remove(assignments, assignment);

      const movedStmts: u.Statement[] = [];
      parentPath.traverse({
        Statement(path) {
          if (
            path.isReturnStatement() ||
            u.test<u.Statement>(
              path,
              path => path.isIdentifier() && !path.isReferenced(),
            )
          ) {
            path.skip();
          } else {
            u.replace<u.Statement>(path, [left, right], variable);
            movedStmts.push(cloneDeep(path.node));
            path.remove();
          }
        },
      });

      if (movedStmts.length === 0) {
        return;
      }

      state.replacements.push({
        original: left,
        replaced: variable,
        scope: path.scope,
      });
      state.replacements.push({
        original: right,
        replaced: variable,
        scope: path.scope,
      });

      const { platform } = state.escapin.config;

      const name = variable.name.replace(/[^A-Za-z0-9]/g, '');
      const handler = `${Path.basename(
        state.filename,
        Path.extname(state.filename),
      )}.${variable.name}`;
      const resource = left.object.name;
      const { id } = state.escapin;

      state.escapin.addServerlessConfig(`${platform}.function`, {
        name,
        handler,
      });
      state.escapin.addServerlessConfig(`${service}.function`, {
        name,
        resource,
        id,
      });

      state.pushProgramBody(
        u.snippetFor(`${service}.function`, {
          $VAR: variable,
          $NAME: u.stringLiteral(resource),
          $BODY: movedStmts,
        }),
      );

      path.skip();
    },
    UnaryExpression(path, state): void {
      const { argument, operator } = path.node;
      if (!u.isMemberExpression(argument)) {
        return;
      }

      const { object, property } = argument;
      if (!u.equals(id, object)) {
        return;
      }

      const stmtPath = path.findParent(path => path.isStatement());

      switch (operator) {
        case 'delete':
          stmtPath.replaceWithMultiple(
            u.snippetFor(`${service}.delete`, {
              $KEY: property,
              $NAME: u.stringLiteral(`${id.name}-${state.escapin.id}`),
              $TEMPVAR: path.scope.generateUidIdentifier('temp'),
            }),
          );
          break;
        default:
          break;
      }
      path.skip();
    },
    CallExpression(path, state): void {
      fetchObjectKeys(path, state, id, service);
    },
  };
}

export default visitor;
