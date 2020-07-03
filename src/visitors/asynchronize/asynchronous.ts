import { getNames } from '../../functionTypes';
import { BaseState } from '../../state';
import { isAsynchronous } from '../../types';
import * as u from '../../util';

export function fetchAsynchronous(
  path: u.NodePath<u.CallExpression>,
  asynchronized: u.Node[],
  state: BaseState,
): boolean {
  const { node } = path;
  if (null === path.findParent(path => u.isFunction(path.node))) {
    return false;
  }

  const names = getNames(path.get('callee'));
  const entry = state.escapin.types.get(...names);
  if (!isAsynchronous(entry)) {
    return false;
  }

  asynchronized.push(node);

  path.replaceWith(u.awaitExpression(node));

  return true;
}
