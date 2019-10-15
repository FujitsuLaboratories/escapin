import { commandSync } from 'execa';
import fs from 'fs';
import { uniq } from 'lodash';
import path from 'path';
import * as ts from 'typescript';
import { installTypes } from 'types-installer';
import { Escapin } from '..';
import * as t from '../types';
import * as u from '../util';

export default function(escapin: Escapin) {
  console.log('functionType');

  const { output_dir } = escapin.config;

  console.log('flush changes');

  escapin.save();

  console.log(`install types at ${output_dir}`);

  const { dependencies, devDependencies } = escapin.packageJson;
  installTypesInDependencies(dependencies, devDependencies, output_dir);

  console.log('npm install');

  commandSync('npm install', {
    cwd: output_dir,
    stdout: process.stdout,
  });

  console.log('reload package.json');

  const packageJson = JSON.parse(fs.readFileSync(path.join(output_dir, 'package.json'), 'utf8'));
  escapin.packageJson = packageJson;

  console.log('check function types');

  for (const filename in escapin.states) {
    checkFunctionTypes(escapin.types, filename, output_dir);
  }

  for (const entry of escapin.types.getAll()) {
    console.log(entry);
  }
}

function installTypesInDependencies(
  dependencies: { [moduleName: string]: string },
  devDependencies: { [moduleName: string]: string },
  pwd: string,
) {
  u.deasyncPromise(
    installTypes(Object.keys(dependencies), {
      selections: {
        dependencies,
        devDependencies,
        all: Object.assign(dependencies, devDependencies),
      },
      selection: 'all',
      pwd,
      toDev: true,
      packageManager: 'npm',
    }),
  );
}

function checkFunctionTypes(types: t.TypeDictionary, filename: string, output_dir: string) {
  const program = ts.createProgram([path.join(output_dir, filename)], {
    allowJs: true,
    typeRoots: [path.join(output_dir, 'node_modules')],
  });
  const checker = program.getTypeChecker();
  for (const sourceFile of program.getSourceFiles()) {
    if (!sourceFile.isDeclarationFile) {
      ts.forEachChild(sourceFile, visit);
    }
  }

  // TODO: find out the below types from the AST
  types.put(t.errorFirstCallback('request'));

  function visit(node: ts.Node) {
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
        let paramType = checker.getTypeOfSymbolAtLocation(lastParam, lastParam.valueDeclaration!);
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
  }
}
