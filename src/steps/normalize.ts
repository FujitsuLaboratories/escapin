import { Visitor } from '@babel/traverse';
import * as u from '../util';
import { BaseState } from '../state';

export default function(baseState: BaseState) {
  console.log('normalize');
  u.traverse(visitor, baseState);
}

const visitor: Visitor = {
  VariableDeclaration(path) {
    if (path.node.declarations.length === 1) {
      return;
    }
    const snippet = [];
    for (const decl of path.node.declarations) {
      snippet.push(u.variableDeclaration(path.node.kind, [decl]));
    }
    path.replaceWithMultiple(snippet);
  },
  IfStatement(path) {
    if (!u.isBlockStatement(path.node.consequent)) {
      path.node.consequent = u.blockStatement([path.node.consequent]);
    }
    if (path.node.alternate !== null && !u.isBlockStatement(path.node.alternate)) {
      path.node.alternate = u.blockStatement([path.node.alternate]);
    }
  },
  ForStatement(path) {
    if (!u.isBlockStatement(path.node.body)) {
      path.node.body = u.blockStatement([path.node.body]);
    }
  },
  ForInStatement(path) {
    if (!u.isBlockStatement(path.node.body)) {
      path.node.body = u.blockStatement([path.node.body]);
    }
  },
  ForOfStatement(path) {
    if (!u.isBlockStatement(path.node.body)) {
      path.node.body = u.blockStatement([path.node.body]);
    }
  },
  WhileStatement(path) {
    if (!u.isBlockStatement(path.node.body)) {
      path.node.body = u.blockStatement([path.node.body]);
    }
  },
  DoWhileStatement(path) {
    if (!u.isBlockStatement(path.node.body)) {
      path.node.body = u.blockStatement([path.node.body]);
    }
  },
  ArrowFunctionExpression(path) {
    if (!u.isBlockStatement(path.node.body)) {
      path.node.body = u.blockStatement([u.returnStatement(path.node.body)]);
    }
  },
};
