import { Visitor } from '@babel/traverse';
import * as u from '../util';

function newVisitor(): Visitor {
  let importDeclarations: { [moduleName: string]: u.ImportDeclaration } = {};
  return {
    Program(): void {
      importDeclarations = {};
    },
    TemplateLiteral(path): void {
      if (
        path.node.expressions.every(
          expr => u.isStringLiteral(expr) || u.isNumericLiteral(expr),
        ) ||
        path.node.expressions.length === 0
      ) {
        path.replaceWith(u.stringLiteral(u.evalSnippet(path.node)));
      }
    },
    ImportDeclaration(path): void {
      const { node } = path;
      const { source, specifiers } = node;
      const moduleName = source.value;
      if (!(moduleName in importDeclarations)) {
        importDeclarations[moduleName] = node;
      } else {
        const { specifiers: elderSpecifiers } = importDeclarations[moduleName];
        for (const specifier of specifiers) {
          if (
            u.isImportSpecifier(specifier) &&
            !elderSpecifiers.some(that => u.equals(that, specifier))
          ) {
            elderSpecifiers.push(specifier);
          }
        }
        path.remove();
      }
    },
  };
}

export default newVisitor();
