import { Visitor } from '@babel/traverse';
import { cloneDeep } from 'lodash';
import Path from 'path';
import { Escapin } from '..';
import * as u from '../util';
import { SyntaxError } from '../error';
import { BaseState } from '../state';

export default function(escapin: Escapin) {
  console.log('refineObject');
  for (const filename in escapin.states) {
    u.traverse(visitor, new ObjectState(escapin.states[filename]));
  }
}

class ObjectState extends BaseState {
  constructor(base?: BaseState) {
    super(base);
    this.objects = [];
    this.assignments = [];
  }
  public objects: Array<{ id: u.Identifier; service: string }>;
  public assignments: Array<{
    left: u.MemberExpression;
    right: u.Expression;
    variable: u.Identifier;
    snippet: u.Node;
    service: string;
  }>;
}

const visitor: Visitor<ObjectState> = {
  ExportNamedDeclaration(path, state) {
    const { declaration } = path.node;
    if (!u.isVariableDeclaration(declaration)) {
      return;
    }
    const firstDeclarator = declaration.declarations[0];
    const { id, init } = firstDeclarator;
    if (
      !u.isIdentifier(id) ||
      init === null ||
      !u.isObjectExpression(init) ||
      init.properties.length > 0
    ) {
      return;
    }

    let service = 'dynamodb';
    if (
      u.isTSTypeAnnotation(id.typeAnnotation) &&
      u.isTSTypeReference(id.typeAnnotation.typeAnnotation)
    ) {
      const { typeName } = id.typeAnnotation.typeAnnotation;
      service = u.getTypeName(typeName);
    } else {
      throw new SyntaxError('Invalid type annotation', id, state);
    }

    if (!service.startsWith(`${state.escapin.config.platform}.`)) {
      service = `${state.escapin.config.platform}.${service}`;
    }

    state.objects.push({ id, service });

    state.unshiftProgramBody(u.snippetFor(service));

    state.escapin.addServerlessConfig(service, {
      name: id.name,
      id: state.escapin.id,
    });

    path.remove();
  },
  MemberExpression(path, state) {
    const { node } = path;
    const { object, property } = node;
    if (!u.isIdentifier(object)) {
      return;
    }
    const entry = state.objects.find(entry => u.equals(entry.id, object));
    if (entry === undefined) {
      return;
    }
    let replacement = u.reuseReplacement(path, state, node);
    if (replacement) {
      console.log(`replacing ${u.generate(node)} with ${u.generate(replacement.replaced)}`);
      u.replace(path, node, replacement.replaced);
      return;
    }

    const { id, service } = entry;

    const variable = path.scope.generateUidIdentifier(id.name);

    const letSnippet = u.snippetFor(`${service}.get_let`, {
      $NAME: u.stringLiteral(`${id.name}-${state.escapin.id}`),
      $KEY: property,
      $VAR: variable,
      $TEMPVAR: path.scope.generateUidIdentifier('temp'),
    });

    const assignmentSnippet = u.snippetFor(`${service}.get_assign`, {
      $NAME: u.stringLiteral(`${id.name}-${state.escapin.id}`),
      $KEY: property,
      $VAR: variable,
      $TEMPVAR: path.scope.generateUidIdentifier('temp'),
    });

    const stmtPath = path.findParent(path => path.isStatement());
    if (stmtPath === null) {
      throw new Error(JSON.stringify(path.parent, null, 2));
    }
    if (stmtPath.isExpressionStatement() && u.equals(stmtPath.node.expression, id)) {
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
    u.replace(stmtPath, id, variable);

    state.replacements.push({
      original: id,
      replaced: variable,
      scope: path.scope,
    });
    path.skip();
  },
  AssignmentExpression(path, state) {
    const { left, right } = path.node;
    if (!u.isMemberExpression(left)) {
      return;
    }
    const id = left.object;
    if (!u.isIdentifier(id)) {
      return;
    }

    const entry = state.objects.find(entry => u.equals(entry.id, id));
    if (entry === undefined) {
      return;
    }

    const { service } = entry;

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

    state.assignments.push({
      left,
      right,
      variable,
      snippet: snippet[1],
      service,
    });
    path.skip();
  },
  VariableDeclaration(path, state) {
    const assignment = state.assignments.find(that => u.includes(path, that.snippet));
    if (assignment === undefined) {
      return;
    }
    const { left, right, variable, service } = assignment;
    const parentPath = path.parentPath;
    if (!u.isIdentifier(left.object)) {
      return;
    }

    u.remove(state.assignments, assignment);

    let movedStmts: u.Statement[] = [];
    parentPath.traverse({
      Statement(path) {
        if (u.test(path, path => path.isIdentifier() && !path.isReferenced())) {
          path.skip();
        } else if (path.isReturnStatement()) {
          path.skip();
        } else {
          u.replace(path, [left, right], variable);
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
    const handler = `${Path.basename(state.filename, Path.extname(state.filename))}.${
      variable.name
    }`;
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
  UnaryExpression(path, state) {
    const { argument, operator } = path.node;
    if (!u.isMemberExpression(argument)) {
      return;
    }

    const { object, property } = argument;
    if (!u.isIdentifier(object)) {
      return;
    }
    const entry = state.objects.find(entry => u.equals(entry.id, object));
    if (entry === undefined) {
      return;
    }
    const { service } = entry;

    const stmtPath = path.findParent(path => path.isStatement());

    switch (operator) {
      case 'delete':
        stmtPath.replaceWithMultiple(
          u.snippetFor(`${service}.delete`, {
            $KEY: property,
            $NAME: u.stringLiteral(`${object.name}-${state.escapin.id}`),
            $TEMPVAR: path.scope.generateUidIdentifier('temp'),
          }),
        );
        break;
      default:
        break;
    }
    path.skip();
  },
  CallExpression(path, state) {
    const { node } = path;
    const entry = state.objects.find(entry =>
      u.equals(node, u.expression('Object.keys($OBJ)', { $OBJ: entry.id })),
    );
    if (entry === undefined) {
      return;
    }
    const { service } = entry;

    try {
      const arguments0 = node.arguments[0] as u.Identifier;
      const { name } = arguments0;
      const tempVar = path.scope.generateUidIdentifier('temp');
      const variable = path.scope.generateUidIdentifier(name);
      const snippet = u.snippetFor(`${service}.keys`, {
        $NAME: u.stringLiteral(`${name}-${state.escapin.id}`),
        $TEMPVAR: tempVar,
        $VAR: variable,
      });
      const stmtPath = path.findParent(path => path.isStatement());
      for (const line of snippet) {
        stmtPath.insertBefore(line);
      }
      u.replace(stmtPath, node, variable);

      state.replacements.push({
        original: node,
        replaced: variable,
        scope: path.scope,
      });
    } catch (err) {
      throw new SyntaxError(err, node, state);
    }
    path.skip();
  },
};
