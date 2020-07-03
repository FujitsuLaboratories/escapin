import { EscapinSyntaxError } from '../../error';
import { getNames } from '../../functionTypes';
import { BaseState } from '../../state';
import { isErrorFirstCallback } from '../../types';
import * as u from '../../util';

type FunctionParameter = u.Identifier | u.RestElement | u.TSParameterProperty;

function isFunctionParameter(node: u.Node): node is FunctionParameter {
  return (
    u.isIdentifier(node) ||
    u.isRestElement(node) ||
    u.isTSParameterProperty(node)
  );
}

export function fetchErrorFirstCallback(
  path: u.NodePath<u.CallExpression>,
  asynchronized: u.Node[],
  state: BaseState,
): boolean {
  const { node: original } = path;
  const names = getNames(path.get('callee'));
  const entry = state.escapin.types.get(...names);
  if (!isErrorFirstCallback(entry)) {
    return false;
  }

  asynchronized.push(original);

  const args: FunctionParameter[] = [u.identifier('err')];

  const declPath = path.findParent(path =>
    u.isVariableDeclaration(path.node),
  ) as u.NodePath<u.VariableDeclaration>;

  if (declPath === null) {
    original.arguments.push(
      u.parseExpression(
        'err => { if (err) { reject(err); } else { resolve(); } }',
      ),
    );
    path.replaceWith(
      u.awaitExpression(
        u.expression('new Promise((resolve, reject) => {$ORIGINAL})', {
          $ORIGINAL: u.expressionStatement(original),
        }),
      ),
    );
    return true;
  }

  const data = path.scope.generateUidIdentifier('data');
  const { node } = declPath;
  const { declarations } = node;
  const { id } = declarations[0];

  let newId!: u.Node;
  if (u.isObjectPattern(id)) {
    for (const property of id.properties) {
      let param!: FunctionParameter;
      if (u.isObjectProperty(property)) {
        const { key } = property;
        if (!isFunctionParameter(key)) {
          throw new EscapinSyntaxError('Unsupported type', id, state);
        }
        param = key;
        u.replace(
          declPath.parentPath,
          param,
          u.memberExpression(data, param),
          path =>
            path.isObjectProperty() ||
            path.isMemberExpression() ||
            path.isFunction(node),
        );
      } else if (u.isRestElement(property)) {
        param = property;
      }
      args.push(param);
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
    u.replace(declPath.parentPath, id, data);
  } else {
    throw new EscapinSyntaxError('Unsupported type', id, state);
  }
  declarations[0].id = data;

  original.arguments.push(
    u.arrowFunctionExpression(
      args,
      u.blockStatement(
        u.statements('if (err) { reject(err); } else { resolve($DATA); }', {
          $DATA: newId || id,
        }),
      ),
    ),
  );
  const modified = u.awaitExpression(
    u.expression('new Promise((resolve, reject) => {$ORIGINAL})', {
      $ORIGINAL: u.expressionStatement(original),
    }),
  );
  path.replaceWith(modified);
  if (
    !u.test(
      declPath.parentPath,
      path => u.equals(path.node, data),
      path => path.node === node,
    )
  ) {
    declPath.replaceWith(u.expressionStatement(modified));
  }
  return true;
}
