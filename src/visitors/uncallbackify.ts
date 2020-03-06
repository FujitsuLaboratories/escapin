import { Visitor } from '@babel/traverse';
import { last } from 'lodash';
import * as u from '../util';
import { EscapinSyntaxError } from '../error';
import { BaseState } from '../state';

const visitor: Visitor<BaseState> = {
  CallExpression(path, state) {
    const stmtPath = path.findParent(path => path.isStatement());
    if (!stmtPath.isExpressionStatement() || stmtPath.node.expression !== path.node) {
      return;
    }
    const args = path.get('arguments') as u.NodePath<u.Expression>[];
    const callbackPath = last(args);
    if (callbackPath?.node === null || !callbackPath?.isFunction()) {
      return;
    }
    const params = callbackPath.get('params') as u.NodePath[];
    if (!u.isErrorParam(params[0].node)) {
      return;
    }
    const errorParam = params.shift() as u.NodePath<u.Identifier>;
    let consequent = [];
    let alternate = [];
    const bodyPath = callbackPath.get('body') as u.NodePath;
    if (bodyPath.isBlockStatement()) {
      const blockPath = bodyPath.get('body') as u.NodePath<u.Statement>[];
      for (const stmtPath of blockPath) {
        if (stmtPath.isIfStatement() && u.includes(stmtPath, errorParam.node)) {
          const stmt = stmtPath.node;
          const result = u.evalSnippet(stmt.test, { [errorParam.node.name]: new Error() });
          if (result) {
            alternate.push(...u.toStatements(stmt.consequent));
            if (stmt.alternate !== null) {
              consequent.push(...u.toStatements(stmt.alternate));
            }
          } else {
            consequent.push(...u.toStatements(stmt.consequent));
            if (stmt.alternate !== null) {
              alternate.push(...u.toStatements(stmt.alternate));
            }
          }
        } else {
          consequent.push(stmtPath.node);
        }
      }
    }

    consequent = consequent.filter(stmt => !u.isReturnStatement(stmt));
    alternate = alternate.filter(stmt => !u.isReturnStatement(stmt));

    callbackPath.remove();

    stmtPath.replaceWith(
      u.statement('try { const $OBJ = $FUNC; $CONSEQUENT; } catch ($ERROR) { $ALTERNATE; }', {
        $ALTERNATE: alternate,
        $CONSEQUENT: consequent,
        $ERROR: errorParam.node,
        $FUNC: path.node,
        $OBJ: getObjectPattern(params, state),
      }),
    );
  },
};

function getObjectPattern(params: u.NodePath[], state: BaseState): u.ObjectPattern {
  return u.objectPattern(
    params.map(param => {
      const { node } = param;
      if (u.isRestElement(node)) {
        return node;
      } else if (u.isExpression(node) || u.isPatternLike(node)) {
        return u.objectProperty(node, node, false, true);
      } else {
        throw new EscapinSyntaxError('Unsupported parameter type', node, state);
      }
    }),
  );
}

export default visitor;
