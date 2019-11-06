import { Visitor } from '@babel/traverse';
import { last } from 'lodash';
import { Escapin } from '..';
import * as u from '../util';
import * as t from '../types';
import { SyntaxError } from '../error';
import { BaseState } from '../state';

export default function(escapin: Escapin) {
  console.log('asynchronize');
  const states: { [filename: string]: AsynchronizationState } = {};
  for (const filename in escapin.states) {
    states[filename] = new AsynchronizationState(escapin.states[filename]);
  }
  do {
    for (const filename in escapin.states) {
      states[filename].changed = false;
      u.traverse(visitor, states[filename]);
    }
  } while (Object.values(states).some(state => state.changed));
}

class AsynchronizationState extends BaseState {
  public asynchronized: u.Node[];
  public changed: boolean;
  constructor(base?: BaseState) {
    super(base);
    this.asynchronized = [];
    this.changed = false;
  }
}

const visitor: Visitor<AsynchronizationState> = {
  Function(path, state) {
    const { node } = path;
    if (state.asynchronized.includes(node)) {
      path.skip();
      return;
    }

    if (!(u.test(path, _path => _path.isAwaitExpression()) && !node.async)) {
      return;
    }

    const parent = path.parentPath.node;

    if (u.isCallExpression(parent) && parent.callee !== node) {
      return;
    }

    state.asynchronized.push(node);

    node.async = true;
    state.changed = true;
  },
  CallExpression(path, state) {
    if (state.asynchronized.includes(path.node)) {
      path.skip();
      return;
    }

    fetchGeneralCallback(path, state) || fetchAsynchronous(path, state);
  },
  For(path, state) {
    if (state.asynchronized.includes(path.node)) {
      path.skip();
      return;
    }

    if (!u.test(path, _path => u.isSimpleAwaitStatement(_path.node))) {
      return;
    }

    state.asynchronized.push(path.node);

    const decl = path.get(path.isForStatement() ? 'init' : 'left') as u.NodePath<
      u.VariableDeclaration
    >;
    for (const declarator of decl.node.declarations) {
      const { id } = declarator;
      if (!u.isIdentifier(id)) {
        continue;
      }
      declarator.id = path.scope.generateUidIdentifier(id.name);
      u.replace(path, id, declarator.id);
    }

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
      u.statement('{ $PROMISE.push((async () => {$BODY})()); }', {
        $PROMISE: promise,
        $BODY: block.node.body,
      }),
    );
    path.insertAfter(
      u.expressionStatement(
        u.awaitExpression(u.expression('Promise.all($PROMISE)', { $PROMISE: promise })),
      ),
    );

    path.skip();
    state.changed = true;
  },
  VariableDeclaration(path, state) {
    const { node } = path;
    if (state.asynchronized.includes(node)) {
      path.skip();
      return;
    }
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
    if (!t.isErrorFirstCallback(entry)) {
      return;
    }

    state.asynchronized.push(node);

    const data = path.scope.generateUidIdentifier('data');
    const args = [u.identifier('err')];
    let newId!: u.Node;
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

    declarations[0].init = u.awaitExpression(
      u.expression('new Promise((resolve, reject) => {$INIT})', {
        $INIT: u.expressionStatement(init),
      }),
    );

    if (!u.test(path.parentPath, path => u.equals(path.node, data), path => path.node === node)) {
      path.replaceWith(u.expressionStatement(declarations[0].init));
    }

    path.skip();

    state.changed = true;
  },
};

function fetchGeneralCallback(
  path: u.NodePath<u.CallExpression>,
  state: AsynchronizationState,
): boolean {
  const names = t.getNames(path.get('callee') as u.NodePath);
  const entry = state.escapin.types.get(...names);
  if (!t.isGeneralCallback(entry)) {
    return false;
  }

  const callbackPath = last(path.get('arguments') as u.NodePath[]) as u.NodePath;
  if (!callbackPath?.isFunction()) {
    return false;
  }

  const { node } = path;
  state.asynchronized.push(node);

  const callback = callbackPath.node;
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
      state.changed = true;
      return true;
    case 'forEach':
      callback.async = true;
      state.asynchronized.push(node);
      state.changed = true;
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
        if (!t.isAsynchronous(entry)) {
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
        if (!t.isAsynchronous(entry)) {
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
  path.skip();

  state.changed = true;
  return true;
}

function fetchAsynchronous(path: u.NodePath<u.CallExpression>, state: AsynchronizationState) {
  const { node } = path;
  if (null === path.findParent(path => u.isFunction(path.node))) {
    return false;
  }

  const names = t.getNames(path.get('callee') as u.NodePath);
  const entry = state.escapin.types.get(...names);
  if (!t.isAsynchronous(entry)) {
    return false;
  }

  state.asynchronized.push(node);

  path.replaceWith(u.awaitExpression(node));

  path.skip();

  state.changed = true;
  return true;
}
