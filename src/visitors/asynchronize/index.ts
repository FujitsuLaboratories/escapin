import { Visitor } from '@babel/traverse';
import { getNames } from '../../functionTypes';
import { BaseState } from '../../state';
import { asynchronous } from '../../types';
import * as u from '../../util';
import { fetchAsynchronous } from './asynchronous';
import { fetchErrorFirstCallback } from './errorFirstCallback';
import { fetchGeneralCallback } from './generalCallback';
import { EscapinSyntaxError } from '../../error';

function newVisitor(): Visitor<BaseState> {
  const asynchronized: u.Node[] = [];
  let changed = false;
  const visitor: Visitor<BaseState> = {
    Program: {
      enter(): void {
        changed = false;
      },
      exit(path, state): void {
        if (changed) {
          u.traverse(visitor, state);
        }
      },
    },
    Function(path, state): void {
      const { node } = path;

      if (
        !u.test<u.Function>(path, path => path.isAwaitExpression()) ||
        node.async
      ) {
        return;
      }

      node.async = true;
      const stmtPath = (path.isFunctionDeclaration()
        ? path
        : path.findParent(path => u.isStatement(path.node))) as u.NodePath;
      const names = getNames(stmtPath);
      const entry = asynchronous(...names);
      console.log(entry);
      state.escapin.types.put(entry);

      asynchronized.push(node);
      changed = true;
    },
    CallExpression(path, state): void {
      if (asynchronized.includes(path.node)) {
        path.skip();
        return;
      }

      const done =
        fetchErrorFirstCallback(path, asynchronized, state) ||
        fetchGeneralCallback(path, asynchronized, state) ||
        fetchAsynchronous(path, asynchronized, state);

      if (done) {
        changed = true;
        path.skip();
      }
    },
    For(path, state): void {
      if (asynchronized.includes(path.node)) {
        path.skip();
        return;
      }

      if (!u.test<u.For>(path, path => u.isSimpleAwaitStatement(path.node))) {
        return;
      }

      asynchronized.push(path.node);

      const decl = path.get(
        path.isForStatement() ? 'init' : 'left',
      ) as u.NodePath<u.VariableDeclaration>;
      for (const declarator of decl.node.declarations) {
        const { id } = declarator;
        if (!u.isIdentifier(id)) {
          throw new EscapinSyntaxError('Unsupported type', id, state);
        }
        declarator.id = path.scope.generateUidIdentifier(id.name);
        u.replace<u.For>(path, id, declarator.id);
      }

      const promise = path.scope.generateUidIdentifier('promise');

      path.insertBefore(
        u.statement('let $PROMISE = [];', { $PROMISE: promise }),
      );
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
          u.awaitExpression(
            u.expression('Promise.all($PROMISE)', { $PROMISE: promise }),
          ),
        ),
      );

      changed = true;
      path.skip();
    },
  };

  return visitor;
}

export default newVisitor();
