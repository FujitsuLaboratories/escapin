import { Visitor } from '@babel/traverse';
import { BaseState } from '../../state';
import * as u from '../../util';
import fetchAsynchronous from './asynchronous';
import fetchErrorFirstCallback from './errorFirstCallback';
import fetchGeneralCallback from './generalCallback';

function newVisitor(): Visitor<BaseState> {
  const asynchronized: u.Node[] = [];
  let changed = false;
  const visitor: Visitor<BaseState> = {
    Program: {
      enter(path): void {
        changed = false;
      },
      exit(path, state): void {
        if (changed) {
          path.traverse(visitor, state);
        }
      },
    },
    Function(path): void {
      const { node } = path;
      if (asynchronized.includes(node)) {
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

      asynchronized.push(node);

      node.async = true;
      changed = true;
    },
    CallExpression(path, state): void {
      if (asynchronized.includes(path.node)) {
        path.skip();
        return;
      }

      const done =
        fetchGeneralCallback(path, asynchronized, state) ||
        fetchAsynchronous(path, asynchronized, state);

      if (done) {
        changed = true;
        path.skip();
      }
    },
    For(path): void {
      if (asynchronized.includes(path.node)) {
        path.skip();
        return;
      }

      if (!u.test(path, _path => u.isSimpleAwaitStatement(_path.node))) {
        return;
      }

      asynchronized.push(path.node);

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

      changed = true;
      path.skip();
    },
    VariableDeclaration(path, state): void {
      if (asynchronized.includes(path.node)) {
        path.skip();
        return;
      }

      const done = fetchErrorFirstCallback(path, asynchronized, state);

      if (done) {
        changed = true;
        path.skip();
      }
    },
  };

  return visitor;
}

export default newVisitor();
