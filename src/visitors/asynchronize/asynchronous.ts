import { BaseState } from '../../state';
import * as t from '../../types';
import * as u from '../../util';

export default function(
  path: u.NodePath<u.CallExpression>,
  asynchronized: u.Node[],
  state: BaseState,
): boolean {
  const { node } = path;
  if (null === path.findParent(path => u.isFunction(path.node))) {
    return false;
  }

  const names = t.getNames(path.get('callee') as u.NodePath);
  const entry = state.escapin.types.get(...names);
  if (!t.isAsynchronous(entry)) {
    return false;
  }

  asynchronized.push(node);

  path.replaceWith(u.awaitExpression(node));

  path.skip();
  return true;
}
