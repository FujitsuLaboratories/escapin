import { uniq } from 'lodash';
import * as ts from 'typescript';
import * as t from '../../types';
import * as u from '../../util';

export default function(types: t.TypeDictionary, checker: ts.TypeChecker): (node: ts.Node) => void {
  return function visit(node: ts.Node): void {
    try {
      if (ts.isCallExpression(node)) {
        const symbol = checker.getSymbolAtLocation(node.expression);
        if (symbol === undefined) {
          return;
        }
        const name = checker.symbolToString(symbol);
        const signature = checker.getResolvedSignature(node);
        if (signature === undefined) {
          return;
        }
        let names: string[] = [name];
        ts.forEachChild(node.expression, (node: ts.Node) => {
          if (ts.isIdentifier(node)) {
            names.push(node.getText());
          }
        });
        names = uniq(names);

        const params = signature.getParameters();
        if (params.length === 0) {
          return;
        }
        const lastParam = params[params.length - 1];
        if (lastParam.valueDeclaration === null) {
          return;
        }
        let paramType = checker.getTypeOfSymbolAtLocation(lastParam, lastParam.valueDeclaration);
        let paramTypeNode = checker.typeToTypeNode(paramType);
        if (paramTypeNode !== undefined && ts.isTypeReferenceNode(paramTypeNode)) {
          paramType = checker.getTypeFromTypeNode(paramTypeNode);
          paramTypeNode = checker.typeToTypeNode(paramType);
        }
        if (paramTypeNode === undefined) {
          return;
        }
        if (ts.isFunctionTypeNode(paramTypeNode)) {
          const firstParam = paramTypeNode.parameters[0];
          const firstParamSymbol = checker.getSymbolAtLocation(firstParam.name);
          if (firstParamSymbol === undefined) {
            return;
          }
          const str = checker.symbolToString(firstParamSymbol);
          if (str.match(u.ERROR_PATTERN)) {
            types.put(t.errorFirstCallback(...names));
          } else {
            types.put(t.generalCallback(...names));
          }
        } else {
          const returnType = signature.getReturnType();
          const returnSymbol = returnType.getSymbol();
          if (returnSymbol === undefined) {
            return;
          }
          const returnName = checker.symbolToString(returnSymbol);
          if (returnName === 'Promise') {
            types.put(t.asynchronous(...names));
          } else {
            types.put(t.general(...names));
          }
        }
      }
    } finally {
      ts.forEachChild(node, visit);
    }
  };
}
