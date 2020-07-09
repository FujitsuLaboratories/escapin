import { uniq } from 'lodash';
import ts from 'typescript';
import { TypeDictionary } from '../../functionTypes';
import {
  asynchronous,
  errorFirstCallback,
  general,
  generalCallback,
} from '../../types';
import * as u from '../../util';

export function newVisit(
  types: TypeDictionary,
  checker: ts.TypeChecker,
): (node: ts.Node) => void {
  function isErrorFirstCallback(signature: ts.Signature): boolean {
    const params = signature.getParameters();
    if (params.length === 0) {
      if (process.env.NODE_ENV === 'test') {
        console.log('params.length is 0');
      }
      return false;
    }
    const lastParam = params[params.length - 1];
    if (lastParam.valueDeclaration === null) {
      if (process.env.NODE_ENV === 'test') {
        console.log('lastParam.valueDeclaration is null');
      }
      return false;
    }
    let paramType = checker.getTypeOfSymbolAtLocation(
      lastParam,
      lastParam.valueDeclaration,
    );
    let paramTypeNode = checker.typeToTypeNode(paramType);
    while (
      paramTypeNode !== undefined &&
      ts.isTypeReferenceNode(paramTypeNode)
    ) {
      paramType = checker.getTypeFromTypeNode(paramTypeNode);
      paramTypeNode = checker.typeToTypeNode(paramType);
    }
    if (paramTypeNode === undefined || !ts.isFunctionTypeNode(paramTypeNode)) {
      if (process.env.NODE_ENV === 'test') {
        console.log('last parameter is not a function');
      }
      return false;
    }
    const firstParam = paramTypeNode.parameters[0];
    const firstParamSymbol = checker.getSymbolAtLocation(firstParam.name);
    if (firstParamSymbol === undefined) {
      if (process.env.NODE_ENV === 'test') {
        console.log('firstParamSymbol is undefined');
      }
      return false;
    }
    const str = checker.symbolToString(firstParamSymbol);
    return str.match(u.ERROR_PATTERN) !== null;
  }

  function isGeneralCallback(signature: ts.Signature): boolean {
    const params = signature.getParameters();
    if (params.length === 0) {
      return false;
    }
    for (const param of params) {
      if (param.valueDeclaration === null) {
        return false;
      }
      let paramType = checker.getTypeOfSymbolAtLocation(
        param,
        param.valueDeclaration,
      );
      let paramTypeNode = checker.typeToTypeNode(paramType);
      if (
        paramTypeNode !== undefined &&
        ts.isTypeReferenceNode(paramTypeNode)
      ) {
        paramType = checker.getTypeFromTypeNode(paramTypeNode);
        paramTypeNode = checker.typeToTypeNode(paramType);
      }
      if (paramTypeNode === undefined) {
        continue;
      }
      if (ts.isFunctionTypeNode(paramTypeNode)) {
        return true;
      }
    }
    return false;
  }

  function isAsynchronous(signature: ts.Signature): boolean {
    const returnType = signature.getReturnType();
    const returnSymbol = returnType.getSymbol();
    if (returnSymbol === undefined) {
      return false;
    }
    const returnName = checker.symbolToString(returnSymbol);
    return returnName === 'Promise';
  }

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

        if (isErrorFirstCallback(signature)) {
          types.put(errorFirstCallback(...names));
        } else if (isGeneralCallback(signature)) {
          types.put(generalCallback(...names));
        } else if (isAsynchronous(signature)) {
          types.put(asynchronous(...names));
        } else {
          types.put(general(...names));
        }
      }
    } finally {
      ts.forEachChild(node, visit);
    }
  };
}
