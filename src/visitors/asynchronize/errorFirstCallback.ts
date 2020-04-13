import { EscapinSyntaxError } from '../../error';
import { getNames } from '../../functionTypes';
import { BaseState } from '../../state';
import { isErrorFirstCallback } from '../../types';
import * as u from '../../util';

export function fetchErrorFirstCallback(
  path: u.NodePath<u.VariableDeclaration>,
  asynchronized: u.Node[],
  state: BaseState,
): boolean {
  const { node } = path;
  const { declarations } = node;
  if (declarations.length !== 1) {
    return false;
  }

  const { id, init } = declarations[0];

  if (u.isIdentifier(id) && u.isIdentifier(init)) {
    const entry = state.escapin.types.get(init.name);

    if (entry && state.escapin.types.get(id.name) === undefined) {
      state.escapin.types.put({ names: [id.name], type: entry.type });
    }
    return false;
  }

  if (
    !u.isCallExpression(init) ||
    u.test(path, path => u.isIdentifier(path.node, { name: 'Promise' }))
  ) {
    return false;
  }

  const names = getNames(path.get('declarations.0.init.callee') as u.NodePath);
  const entry = state.escapin.types.get(...names);
  if (!isErrorFirstCallback(entry)) {
    return false;
  }

  asynchronized.push(node);

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
        path =>
          path.isObjectProperty() ||
          path.isMemberExpression() ||
          path.isFunction(node),
      );
    }
    newId = u.objectExpression(
      id.properties.map(prop =>
        u.isRestElement(prop)
          ? u.spreadElement(prop.argument as u.Identifier)
          : prop,
      ),
    );
  } else if (u.isIdentifier(id)) {
    args.push(id);
    u.replace(path.parentPath, id, data);
  } else {
    throw new EscapinSyntaxError('Unsupported type', id, state);
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

  if (
    !u.test(
      path.parentPath,
      path => u.equals(path.node, data),
      path => path.node === node,
    )
  ) {
    path.replaceWith(u.expressionStatement(declarations[0].init));
  }
  return true;
}
