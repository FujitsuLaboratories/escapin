import { Visitor } from '@babel/traverse';
import { clone, last } from 'lodash';
import { Escapin } from '..';
import * as u from '../util';
import * as t from '../types';
import { SyntaxError } from '../error';
import { BaseState } from '../state';

export default function(escapin: Escapin) {
  console.log('asynchronize');
  for (const filename in escapin.states) {
    u.traverse(visitor, new AsynchronizationState(escapin.states[filename]));
  }
}

class AsynchronizationState extends BaseState {
  public asynchronized: u.Node[];
  constructor(base?: BaseState) {
    super(base);
    this.asynchronized = [];
  }
}

const visitor: Visitor<AsynchronizationState> = {
  Function(path, state) {
    const { node } = path;
    if (!(u.test(path, _path => _path.isAwaitExpression()) && !node.async)) {
      return;
    }

    const parent = path.parentPath.node;

    if (u.isCallExpression(parent) && parent.callee !== node) {
      return;
    }

    node.async = true;
    let id =
      (u.isFunctionDeclaration(node) || u.isFunctionExpression(node)) && node.id !== null
        ? node.id
        : undefined;
    if (u.isVariableDeclarator(parent) && parent.init === node) {
      id = parent.id as u.Identifier;
    }
    if (u.isIdentifier(id)) {
      state.escapin.types.put({ names: [id.name], type: 'asynchronous' });
    }
  },
  CallExpression(path, state) {
    fetchErrorFirstCallback(path, state) ||
      fetchGeneralCallback(path, state) ||
      fetchAsynchronous(path, state);
  },
  For(path, state) {
    if (!u.test(path, path => u.isSimpleAwaitStatement(path.node))) {
      return;
    }
    const decl = path.get(path.isForStatement() ? 'init' : 'left') as u.NodePath<
      u.VariableDeclaration
    >;
    if (state.asynchronized.includes(decl.node)) {
      return;
    }

    for (const declarator of decl.node.declarations) {
      const { id } = declarator;
      if (!u.isIdentifier(id)) {
        continue;
      }
      declarator.id = path.scope.generateUidIdentifier(id.name);
      u.replace(path, id, declarator.id);
    }

    state.asynchronized.push(decl.node);

    const promise = path.scope.generateUidIdentifier('promise');

    path.insertBefore(u.statement('let $PROMISE = [];', { $PROMISE: promise }));
    const block = path.get('body') as u.NodePath<u.BlockStatement>;
    block.traverse({
      ContinueStatement(path) {
        path.replaceWith(u.returnStatement(null));
      },
      BreakStatement(path) {
        path.replaceWith(u.returnStatement(null));
      },
    });
    block.replaceWith(
      u.statement('$PROMISE.push((async () => {$BODY})())', {
        $PROMISE: promise,
        $BODY: block.node.body,
      }),
    );
    path.insertAfter(
      u.expressionStatement(
        u.awaitExpression(u.expression('Promise.all($PROMISE)', { $PROMISE: promise })),
      ),
    );

    makeParentFunctionAsync(path);
  },
  VariableDeclaration(path, state) {
    const { node } = path;
    const { declarations } = node;
    if (declarations.length !== 1) {
      return;
    }

    const { id, init } = declarations[0];

    if (u.isIdentifier(id) && u.isIdentifier(init)) {
      const entry = state.escapin.types.get(init.name);

      if (entry && state.escapin.types.get(id.name) === undefined) {
        state.escapin.types.put({ names: [id.name], type: entry.type });
      }
      return;
    }

    if (
      !u.isCallExpression(init) ||
      u.test(path, path => u.isIdentifier(path.node, { name: 'Promise' }))
    ) {
      return;
    }

    const names = t.getNames(path.get('declarations.0.init.callee') as u.NodePath);
    const entry = state.escapin.types.get(...names);
    if (entry === undefined || !t.isErrorFirstCallback(entry)) {
      return;
    }

    const data = path.scope.generateUidIdentifier('data');
    const args = [u.identifier('err')];
    let newId: u.Node | undefined;
    if (u.isObjectPattern(id)) {
      for (const property of id.properties) {
        if (u.isRestElement(property)) {
          continue;
        }
        args.push(property.key);
        u.replace(
          path.parentPath,
          property.key,
          u.memberExpression(data, property.key),
          path => path.isObjectProperty() || path.isMemberExpression() || path.isFunction(node),
        );
      }
      newId = u.objectExpression(
        id.properties.map(prop =>
          u.isRestElement(prop) ? u.spreadElement(prop.argument as u.Identifier) : prop,
        ),
      );
    } else if (u.isIdentifier(id)) {
      args.push(id);
      u.replace(path.parentPath, id, data);
    } else {
      throw new SyntaxError('Unsupported type', id, state);
    }
    declarations[0].id = data;
    const callback = u.arrowFunctionExpression(
      args,
      u.blockStatement(
        u.statements('if (err) { reject(err); } else { resolve($DATA); }', {
          $DATA: newId || id,
        }),
      ),
    );
    init.arguments.push(callback);

    state.asynchronized.push(callback);

    declarations[0].init = u.awaitExpression(
      u.expression('new Promise((resolve, reject) => {$INIT})', {
        $INIT: u.expressionStatement(init),
      }),
    );

    makeParentFunctionAsync(path);

    if (!u.test(path.parentPath, path => u.equals(path.node, data), path => path.node === node)) {
      path.replaceWith(u.expressionStatement(declarations[0].init));
    }
    path.skip();
  },
  BlockStatement(path, state) {
    const { node } = path;
    if (countSimpleAwaitStatements(path) === 0 || state.asynchronized.includes(node)) {
      return;
    }

    state.asynchronized.push(node);

    const { body } = node;

    const entries = calculateDependencies(path);
    const decls = [];
    const stmts = clone(body);
    const newBody = [];
    while (Object.keys(stmts).length > 0) {
      const promises = {};
      for (const i in stmts) {
        let stmt = stmts[i];
        const entry = entries[i];
        const consumesKeys = Object.keys(entry.consumes);
        // const producesKeys = Object.keys(entry.produces);
        if (consumesKeys.length === 0) {
          if (u.isVariableDeclaration(stmt)) {
            const decl = stmt.declarations[0];
            decls.push(u.variableDeclaration('let', [u.variableDeclarator(decl.id)]));
            if (decl.init === null) {
              stmt = u.expressionStatement(<u.Identifier>decl.id);
            } else {
              stmt = u.statement('$ID = $INIT;', { $ID: decl.id, $INIT: decl.init });
            }
          }
          promises[i] = { stmt, next: [], primary: true };
          console.log(i);
          delete stmts[i];
        } else if (consumesKeys.length === 1 && promises[consumesKeys[0]]) {
          if (u.isVariableDeclaration(stmt)) {
            const decl = stmt.declarations[0];
            decls.push(u.variableDeclaration('let', [u.variableDeclarator(decl.id)]));
            if (decl.init === null) {
              stmt = u.expressionStatement(<u.Identifier>decl.id);
            } else {
              stmt = u.statement('$ID = $INIT;', { $ID: decl.id, $INIT: decl.init });
            }
          }
          let j = i;
          let keys = Object.keys(entries[j].consumes);
          console.log('---');
          console.log(j);
          console.log(entries[j]);
          console.log(keys);
          while (keys.length > 0) {
            j = keys[0];
            console.log(j);
            console.log(entries[j]);
            keys = Object.keys(entries[j].consumes);
            console.log(keys);
          }
          console.log(`${i} -> ${j}`);
          promises[j].next.push(i);
          promises[i] = { stmt, next: [], primary: false };
          delete stmts[i];
        } else {
          for (const j in entry.consumes) {
            if (promises[j]) {
              delete entry.consumes[j];
            }
          }
        }
      }
      const promise = path.scope.generateUidIdentifier('promise');
      newBody.push(u.statement('let $PROMISE = [];', { $PROMISE: promise }));
      for (const i in promises) {
        console.log(`${i}: ${JSON.stringify(promises[i].next)}`);
      }
      for (const i in promises) {
        if (!promises[i].primary) {
          continue;
        }
        const stmts: u.Statement[] = [];
        stmts.push(promises[i].stmt);
        for (const j of promises[i].next) {
          stmts.push(promises[j].stmt);
          delete promises[j];
        }
        const asyncFunc = u.statement('$PROMISE.push((async () => {$BODY})())', {
          $PROMISE: promise,
          $BODY: stmts,
        }) as u.ExpressionStatement;
        newBody.push(asyncFunc);
        state.asynchronized.push(u.blockStatement(stmts));
      }
      newBody.push(
        u.statement('await Promise.all($PROMISE);', {
          $PROMISE: promise,
        }),
      );
    }
    node.body = [...decls, ...newBody];
  },
  Statement(path, state) {
    const { node } = path;
    if (u.isVariableDeclaration(node)) {
      return;
    }

    if (u.test(path, path => u.isIdentifier(path.node, { name: 'Promise' }))) {
      return;
    }
    const target = u.find(
      path,
      _path => {
        const { node } = _path;
        if (!u.isCallExpression(node) || !u.isIdentifier(node.callee)) {
          return false;
        }
        const entry = state.escapin.types.get(node.callee.name);
        return entry !== undefined && t.isErrorFirstCallback(entry);
      },
      _path => node !== _path.node && _path.isStatement(),
    ) as u.NodePath<u.CallExpression>;
    if (target === undefined || u.hasCallback(target.node) || state.asynchronized.includes(node)) {
      return;
    }

    const data = path.scope.generateUidIdentifier('data');
    path.insertBefore(u.statement('let $DATA = $ORG;', { $DATA: data, $ORG: target.node }));
    state.asynchronized.push(target.node);

    u.replace(path, target.node, data);
  },
};

function fetchErrorFirstCallback(
  path: u.NodePath<u.CallExpression>,
  state: AsynchronizationState,
): boolean {
  const names = t.getNames(path.get('callee') as u.NodePath);
  const entry = state.escapin.types.get(...names);
  if (!t.isErrorFirstCallback(entry) || state.asynchronized.includes(path.node)) {
    return false;
  }
  const callbackPath = last(path.get('arguments') as u.NodePath[]) as u.NodePath;
  if (callbackPath === undefined || !callbackPath.isFunction()) {
    throw new SyntaxError(
      'This call expression does not have error-first callback.',
      path.node,
      state,
    );
  }
  const callback = callbackPath.node;

  entry.type = 'error-first-callback';
  let id;
  const params = callback.params;
  params.shift();
  if (params.length === 1) {
    id = params[0];
  } else {
    id = u.objectPattern(
      params.map(param => {
        if (u.isRestElement(param)) {
          return param;
        } else if (u.isExpression(param) || u.isPatternLike(param)) {
          return u.objectProperty(param, param, false, true);
        } else {
          throw new SyntaxError('Unsupported parameter type', param, state);
        }
      }),
    );
  }
  let newConsequent: u.Statement[] = [];
  let newAlternate: u.Statement[] = [];
  let error;
  callbackPath.get('body').traverse({
    IfStatement(path) {
      const { test, consequent, alternate } = path.node;
      if (u.isErrorParam(test)) {
        const lastStmt = u.isBlockStatement(consequent)
          ? last(consequent.body)
          : path.node.consequent;
        if (alternate === null && !u.isReturnStatement(lastStmt) && !u.isThrowStatement(lastStmt)) {
          throw new SyntaxError(
            'Consequent clause is not finished by ReturnStatement despite IfStatement does not have alternate clause',
            path.node,
            state,
          );
        }
        error = test;
        newAlternate = u.isBlockStatement(consequent) ? consequent.body : [consequent];
      }
      if (alternate !== null) {
        newConsequent = u.isBlockStatement(alternate) ? alternate.body : [alternate];
      }
      path.skip();
    },
    Statement(path) {
      if (u.test(path, _path => u.isErrorParam(_path.node), _path => u.isFunction(_path.node))) {
        throw new SyntaxError(
          'Cannot separate error handling from the callback function',
          path.node,
          state,
        );
      }
      newConsequent.push(path.node);
      path.skip();
    },
    ReturnStatement(path) {
      path.skip();
    },
  });
  path.node.arguments.pop();
  const parentPath = path.findParent(path => path.isStatement());
  if (error && newAlternate.length > 0) {
    parentPath.replaceWith(
      u.statement('try { const $ID = $INIT; $CONSEQUENT; } catch ($ERROR) { $ALTERNATE }', {
        $ID: id,
        $INIT: path.node,
        $CONSEQUENT: newConsequent,
        $ERROR: error,
        $ALTERNATE: newAlternate,
      }),
    );
  } else {
    parentPath.replaceWithMultiple(
      u.statements('const $ID = $INIT; $CONSEQUENT', {
        $ID: id,
        $INIT: path.node,
        $CONSEQUENT: newConsequent,
      }),
    );
  }
  state.asynchronized.push(path.node);
  path.skip();
  return true;
}

function fetchGeneralCallback(
  path: u.NodePath<u.CallExpression>,
  state: AsynchronizationState,
): boolean {
  const names = t.getNames(path.get('callee') as u.NodePath);
  const entry = state.escapin.types.get(...names);
  if (!t.isGeneralCallback(entry) || state.asynchronized.includes(path.node)) {
    return false;
  }
  const callbackPath = last(path.get('arguments') as u.NodePath[]) as u.NodePath;
  if (callbackPath === undefined || !callbackPath.isFunction()) {
    throw new SyntaxError('This call expression does not have general callback.', path.node, state);
  }
  const callback = callbackPath.node;

  const { node } = path;
  const { callee } = node;
  let functionName;

  if (u.isMemberExpression(callee)) {
    functionName = callee.property.name;
  } else if (u.isIdentifier(callee)) {
    functionName = callee.name;
  } else {
    throw new SyntaxError('Invalid callee', path.node, state);
  }
  switch (functionName) {
    case 'map':
      callback.async = true;
      state.asynchronized.push(node);
      path.replaceWith(
        u.awaitExpression(
          u.expression('Promise.all($ORG)', {
            $ORG: node,
          }),
        ),
      );
      makeParentFunctionAsync(path);
      return true;
    case 'forEach':
      callback.async = true;
      state.asynchronized.push(node);
      return true;
    default:
      break;
  }
  const temp = path.scope.generateUidIdentifier('temp');
  const data = path.scope.generateUidIdentifier('data');
  const done = path.scope.generateUidIdentifier('done');
  callbackPath.traverse({
    VariableDeclaration(path) {
      const declarations0 = path.get('declarations.0') as u.NodePath<u.VariableDeclarator>;
      const init = declarations0.get('init') as u.NodePath;
      if (init.isCallExpression()) {
        const names = t.getNames(init.get('callee') as u.NodePath);
        const entry = state.escapin.types.get(...names);
        if (entry === undefined || !t.isAsynchronous(entry)) {
          return;
        }
      } else if (!u.isAwaitExpression(init.node) || !u.isNewPromise(init.node.argument)) {
        return;
      }
      const func = u.isAwaitExpression(init.node) ? init.node.argument : init.node;
      declarations0.node.init = u.expression(
        '(() => { let $TEMP; let $DONE = false; $FUNC.then($DATA => { $TEMP = $DATA; $DONE = true; }); deasync.loopWhile(_ => !$DONE); return $TEMP; })()',
        {
          $DATA: data,
          $DONE: done,
          $FUNC: func,
          $TEMP: temp,
        },
      );
      state.addDependency('deasync');
      path.skip();
    },
    ExpressionStatement(path) {
      const { expression } = path.node;
      const expressionPath = path.get('expression') as u.NodePath<u.Expression>;
      if (expressionPath.isCallExpression()) {
        const names = t.getNames(expressionPath.get('callee') as u.NodePath);
        const entry = state.escapin.types.get(...names);
        if (entry === undefined || !t.isAsynchronous(entry)) {
          return;
        }
      } else if (!u.isAwaitExpression(expression) || !u.isNewPromise(expression.argument)) {
        return;
      }
      const func = u.isAwaitExpression(expression) ? expression.argument : expression;
      path.replaceWithMultiple(
        u.statements(
          'let $DONE = false; $FUNC.then(_ => { $DONE = true; }); deasync.loopWhile(_ => !$DONE)',
          {
            $DONE: done,
            $FUNC: func,
          },
        ),
      );
      state.unshiftProgramBody(u.snippetFor('misc.import.deasync'));
      state.addDependency('deasync');
      path.skip();
    },
  });
  state.asynchronized.push(node);
  path.skip();
  return true;
}

function fetchAsynchronous(path: u.NodePath<u.CallExpression>, state: AsynchronizationState) {
  const { node } = path;
  const parentFunc = path.findParent(path => u.isFunction(path.node));
  if (parentFunc === null) {
    return false;
  }

  const names = t.getNames(path.get('callee') as u.NodePath);
  const entry = state.escapin.types.get(...names);
  if (!t.isAsynchronous(entry) || state.asynchronized.includes(node)) {
    return false;
  }

  state.asynchronized.push(node);

  path.replaceWith(u.awaitExpression(node));

  makeParentFunctionAsync(path);

  path.skip();
  return true;
}

function countSimpleAwaitStatements(path: u.NodePath<u.BlockStatement>): number {
  return path.node.body.filter(u.isSimpleAwaitStatement).length;
}

function getLatest(vars: string[], name: string): number {
  let latest = -1;
  for (let i = 0; i < vars.length; i++) {
    if (vars[i] === name && i > latest) {
      latest = i;
    }
  }
  return latest;
}

function calculateDependencies(path: u.NodePath<u.BlockStatement>) {
  const entries: Array<{
    async: boolean;
    consumes: { [x: number]: string | number };
    produces: { [x: number]: string | number };
  }> = [];
  const variables: string[] = [];
  const { body } = path.node;
  for (let i = 0; i < body.length; i += 1) {
    const entry = {
      async: false,
      consumes: {},
      produces: {},
    };
    entries[i] = entry;
    const stmt = path.get(`body.${i}`) as u.NodePath;
    const { node } = stmt;
    if (u.isVariableDeclaration(node)) {
      const { name } = node.declarations[0].id as u.Identifier;
      entry.produces[i] = name;
      (stmt.get('declarations.0') as u.NodePath).traverse({
        Identifier(path) {
          const latest = getLatest(variables, path.node.name);
          if (latest === -1) {
            return;
          }
          entry.consumes[latest] = path.node.name;
        },
        AwaitExpression(path) {
          entry.async = true;
        },
      });
      variables[i] = name;
    } else if (u.isExpressionStatement(node) && u.isAssignmentExpression(node.expression)) {
      const { name } = node.expression.left as u.Identifier;
      const latest = getLatest(variables, name);
      if (latest === -1) {
        continue;
      }
      entry.consumes[latest] = i;
      entry.produces[i] = name;
      (stmt.get('expression') as u.NodePath).traverse({
        Identifier(path) {
          const latestOne = getLatest(variables, path.node.name);
          if (latestOne === -1) return;
          entry.consumes[latestOne] = path.node.name;
        },
        AwaitExpression(path) {
          entry.async = true;
        },
      });
      variables[i] = name;
    } else if (u.isStatement(node)) {
      stmt.traverse({
        Identifier(path) {
          const latest = getLatest(variables, path.node.name);
          if (latest === -1) return;
          entry.consumes[latest] = path.node.name;
        },
        AwaitExpression(path) {
          entry.async = true;
        },
      });
    }
  }
  console.log(JSON.stringify(entries));
  return entries;
}

function makeParentFunctionAsync(path: u.NodePath) {
  const functionPath = path.findParent(path => path.isFunction()) as u.NodePath<u.Function>;
  functionPath.node.async = true;
}
