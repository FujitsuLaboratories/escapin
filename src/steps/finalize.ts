import { Visitor } from '@babel/traverse';
import * as u from '../util';
import { BaseState } from '../state';

export default function(baseState: BaseState) {
  console.log('finalize');
  u.traverse(visitor, baseState);
}

const visitor: Visitor = {
  TemplateLiteral(path) {
    if (path.node.expressions.every(expr => u.isStringLiteral(expr) || u.isNumericLiteral(expr))) {
      path.replaceWith(u.stringLiteral(u.evalSnippet(path.node)));
    }
  },
};
