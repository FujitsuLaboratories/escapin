import { last } from 'lodash';
import asynchronize from '.';
import { EscapinSyntaxError } from '../../error';
import { BaseState } from '../../state';
import { getNames } from '../../functionTypes';
import { isGeneralCallback } from '../../types';
import * as u from '../../util';

export function fetchGeneralCallback(
  path: u.NodePath<u.CallExpression>,
  asynchronized: u.Node[],
  state: BaseState,
): boolean {
  const names = getNames(path.get('callee'));
  const entry = state.escapin.types.get(...names);
  if (!isGeneralCallback(entry)) {
    return false;
  }

  const callbackPath = last(path.get('arguments'));
  if (!callbackPath?.isFunction()) {
    return false;
  }

  const { node } = path;
  asynchronized.push(node);

  const callback = callbackPath.node;
  const { callee } = node;
  let functionName: string;

  if (u.isMemberExpression(callee) && u.isIdentifier(callee.property)) {
    functionName = callee.property.name;
  } else if (u.isIdentifier(callee)) {
    functionName = callee.name;
  } else {
    throw new EscapinSyntaxError('Invalid callee', path.node, state);
  }

  callbackPath.traverse(asynchronize, state);

  let asyncRequired = false;
  callbackPath.traverse({
    AwaitExpression(path) {
      asyncRequired = true;
      path.skip();
    },
  });

  if (!asyncRequired) {
    path.skip();
    return true;
  }

  callback.async = true;

  switch (functionName) {
    case 'map':
      path.replaceWith(
        u.awaitExpression(
          u.expression('Promise.all($ORG)', {
            $ORG: node,
          }),
        ),
      );
      break;
    case 'forEach':
      break;
    default:
      callbackPath.replaceWith(
        u.expression(
          `() => { let $TEMP; let $DONE = false;
        ($FUNC)().then($DATA => { $TEMP = $DATA; $DONE = true; });
        deasync.loopWhile(_ => !$DONE); return $TEMP; }`,
          {
            $DATA: path.scope.generateUidIdentifier('data'),
            $DONE: path.scope.generateUidIdentifier('done'),
            $FUNC: callback,
            $TEMP: path.scope.generateUidIdentifier('temp'),
          },
        ),
      );
      state.addDependency('deasync');
      break;
  }
  path.skip();
  return true;
}
