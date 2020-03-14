import { last } from 'lodash';
import { EscapinSyntaxError } from '../../error';
import { BaseState } from '../../state';
import { getNames } from '../../functionTypes';
import { isAsynchronous, isGeneralCallback } from '../../types';
import * as u from '../../util';

export function fetchGeneralCallback(
  path: u.NodePath<u.CallExpression>,
  asynchronized: u.Node[],
  state: BaseState,
): boolean {
  const names = getNames(path.get('callee') as u.NodePath);
  const entry = state.escapin.types.get(...names);
  if (!isGeneralCallback(entry)) {
    return false;
  }

  const callbackPath = last(path.get('arguments') as u.NodePath[]) as u.NodePath;
  if (!callbackPath?.isFunction()) {
    return false;
  }

  const { node } = path;
  asynchronized.push(node);

  const callback = callbackPath.node;
  const { callee } = node;
  let functionName;

  if (u.isMemberExpression(callee)) {
    functionName = callee.property.name;
  } else if (u.isIdentifier(callee)) {
    functionName = callee.name;
  } else {
    throw new EscapinSyntaxError('Invalid callee', path.node, state);
  }
  switch (functionName) {
    case 'map':
      callback.async = true;
      asynchronized.push(node);
      path.replaceWith(
        u.awaitExpression(
          u.expression('Promise.all($ORG)', {
            $ORG: node,
          }),
        ),
      );
      return true;
    case 'forEach':
      callback.async = true;
      asynchronized.push(node);
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
        const names = getNames(init.get('callee') as u.NodePath);
        const entry = state.escapin.types.get(...names);
        if (!isAsynchronous(entry)) {
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
        const names = getNames(expressionPath.get('callee') as u.NodePath);
        const entry = state.escapin.types.get(...names);
        if (!isAsynchronous(entry)) {
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
  return true;
}
