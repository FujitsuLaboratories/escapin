import { Visitor } from '@babel/traverse';
import { Escapin } from '..';
import * as u from '../util';
import { BaseState } from '../state';

export default function(escapin: Escapin): void {
  for (const filename in escapin.states) {
    u.traverse(visitor, new FinalizationState(escapin.states[filename]));
  }
}

class FinalizationState extends BaseState {
  public importDeclarations: { [moduleName: string]: u.ImportDeclaration };
  constructor(base?: BaseState) {
    super(base);
    this.importDeclarations = {};
  }
}

const visitor: Visitor<FinalizationState> = {
  TemplateLiteral(path) {
    if (
      path.node.expressions.every(expr => u.isStringLiteral(expr) || u.isNumericLiteral(expr)) ||
      path.node.expressions.length === 0
    ) {
      path.replaceWith(u.stringLiteral(u.evalSnippet(path.node)));
    }
  },
  ImportDeclaration(path, state) {
    const { node } = path;
    const { source, specifiers } = node;
    if (!u.isStringLiteral(source)) {
      return;
    }
    const moduleName = source.value;
    if (!(moduleName in state.importDeclarations)) {
      state.importDeclarations[moduleName] = node;
    } else {
      const { specifiers: elderSpecifiers } = state.importDeclarations[moduleName];
      for (const specifier of specifiers) {
        if (
          (u.isImportDefaultSpecifier(specifier) &&
            !elderSpecifiers.some(that => u.isImportDefaultSpecifier(that))) ||
          (u.isImportNamespaceSpecifier(specifier) &&
            !elderSpecifiers.some(that => u.isImportNamespaceSpecifier(that))) ||
          (u.isImportSpecifier(specifier) &&
            !elderSpecifiers.some(that => u.equals(that, specifier)))
        ) {
          elderSpecifiers.push(specifier);
        }
      }
      path.remove();
    }
  },
};
