import { Visitor } from '@babel/traverse';
import { cloneDeep } from 'lodash';
import * as u from '../util';
import { SyntaxError } from '../error';
import { BaseState } from '../state';

export default function(baseState: BaseState) {
  console.log('refineObject');
  u.traverse(visitor, new ObjectState(baseState));
}

export class ObjectState extends BaseState {
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

    const rc = state.escapin.serverlessConfig.resources[id.name];
    if (service.startsWith('aws.dynamodb')) {
      state.addDependency('{ DynamoDB }', 'aws-sdk');
      const Type = 'AWS::DynamoDB::Table';
      const Properties = {
        TableName: `${id.name}-${state.escapin.id}`,
        KeySchema: [{ AttributeName: 'key', KeyType: 'HASH' }],
        AttributeDefinitions: [{ AttributeName: 'key', AttributeType: 'S' }],
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5,
        },
      };
      if (rc) {
        rc.Type = Type;
        rc.Properties = Properties;
      } else {
        state.escapin.serverlessConfig.resources[id.name] = {
          Type,
          Properties,
        };
      }
    } else if (service.startsWith('aws.s3')) {
      state.addDependency('{ S3 }', 'aws-sdk');
      const Type = 'AWS::S3::Bucket';
      const Properties = {
        BucketName: `${id.name}-${state.escapin.id}`,
      };
      if (rc) {
        rc.Type = Type;
        rc.Properties = Properties;
      } else {
        state.escapin.serverlessConfig.resources[id.name] = {
          Type,
          Properties,
        };
      }
    }

    //TODO create resource for firstDeclarator

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
    const assignment = state.assignments.find(that => u.equals(path.node, that.snippet));
    if (assignment === undefined) {
      return;
    }
    const { left, right, variable, service } = assignment;
    const parentPath = path.parentPath;

    u.remove(state.assignments, assignment);

    let movedStmts: u.Statement[] = [];
    parentPath.traverse({
      Statement(path) {
        if (u.test(path, path => path.isIdentifier() && !path.isReferenced())) {
          // console.log(u.generate(path.node));
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
      // console.log('AWS_Lambda$DynamoDB_Declare was canceled');
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

    // const object = left.object as u.Identifier;
    // const handler = `${Path.basename(state.currentFile, '.js')}.${variable.name}`;
    // add config to serverless.yaml
    // state.insert(
    //   state.launcherFile,
    //   state.generateSnippet({
    //     $NAME: u.stringLiteral(`${object.name}-${state.escapin.id}`),
    //     $VARNAME: u.stringLiteral(`${handler.replace('.', '-')}-${state.escapin.id}`),
    //     $HANDLER: u.stringLiteral(handler),
    //   }),
    // );
    // state.addDependency(state.launcherFile, 'lambda', '@cc/aws-lambda');
    state.insert(
      u.snippetFor(`${service}.lambda`, {
        $VAR: variable,
        $BODY: movedStmts,
      }),
    );

    // if (state.AWS_Lambda === undefined) {
    //   state.AWS_Lambda = [];
    // }
    // state.AWS_Lambda.push(variable);

    // if (state.AWS_DynamoDB === undefined) {
    //   state.AWS_DynamoDB = [];
    // }
    // state.AWS_DynamoDB.push(object);

    path.skip();
  },
  UnaryExpression(path, state) {
    // DELETE
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
