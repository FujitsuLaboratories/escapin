import { EscapinSyntaxError } from '../../error';
import { BaseState } from '../../state';
import * as u from '../../util';

export function fetchObjectKeys(
  path: u.NodePath<u.CallExpression>,
  state: BaseState,
  id: u.Identifier,
  service: string,
): boolean {
  const { node } = path;
  if (!u.equals(node, u.expression('Object.keys($OBJ)', { $OBJ: id }))) {
    return false;
  }
  try {
    const { name } = id;
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
    throw new EscapinSyntaxError(err, node, state);
  }
  path.skip();
  return true;
}
