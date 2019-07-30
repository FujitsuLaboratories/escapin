import { loopWhile } from 'deasync';
import { commandSync } from 'execa';
import fs from 'fs';
import { uniq } from 'lodash';
import path from 'path';
import * as ts from 'typescript';
import { installTypes } from 'types-installer';
import * as t from '../types';
import { BaseState } from '../state';

export default function(baseState: BaseState) {
  console.log('functionType');

  console.log('flush changes');

  baseState.addImportDeclaration();
  baseState.escapin.save();

  console.log(`install types at ${baseState.escapin.config.output_dir}`);
  let done = false;
  (async () => {
    try {
      await installTypes(Object.keys(baseState.escapin.packageJson.dependencies), {
        selections: {
          dependencies: baseState.escapin.packageJson.dependencies,
          devDependencies: baseState.escapin.packageJson.devDependencies,
          all: Object.assign(
            baseState.escapin.packageJson.dependencies,
            baseState.escapin.packageJson.devDependencies,
          ),
        },
        selection: 'all',
        pwd: baseState.escapin.config.output_dir,
        toDev: true,
        packageManager: 'yarn',
      });
    } catch (err) {
      console.error(err);
    } finally {
      done = true;
    }
  })();
  loopWhile(() => !done);

  console.log('yarn');

  const { stdout } = commandSync(`yarn`, {
    cwd: baseState.escapin.config.output_dir,
    stdout: process.stdout,
  });

  console.log(stdout);

  console.log('reload package.json');

  const packageJson = JSON.parse(
    fs.readFileSync(path.join(baseState.escapin.config.output_dir, 'package.json'), 'utf8'),
  );
  baseState.escapin.packageJson = packageJson;

  console.log('check function types');

  let filename = path.join(baseState.escapin.config.output_dir, baseState.filename);
  const program = ts.createProgram([filename], {
    allowJs: true,
    typeRoots: [path.join(baseState.escapin.config.output_dir, 'node_modules')],
  });
  const checker = program.getTypeChecker();
  for (const sourceFile of program.getSourceFiles()) {
    if (!sourceFile.isDeclarationFile) {
      ts.forEachChild(sourceFile, visit);
    }
  }

  // TODO: find out the below types from the AST
  baseState.escapin.types.put(t.errorFirstCallback('request'));

  for (const entry of baseState.escapin.types.getAll()) {
    console.log(entry);
  }

  function visit(node: ts.Node) {
    if (ts.isCallExpression(node)) {
      const symbol = checker.getSymbolAtLocation(node.expression);
      if (symbol) {
        const name = checker.symbolToString(symbol);
        const signature = checker.getResolvedSignature(node);
        if (signature) {
          let names: string[] = [name];
          ts.forEachChild(node.expression, (node: ts.Node) => {
            if (ts.isIdentifier(node)) {
              names.push(node.getText());
            }
          });
          names = uniq(names);

          const params = signature.getParameters();
          if (params.length > 0) {
            const lastParam = params[params.length - 1];
            let paramType = checker.getTypeOfSymbolAtLocation(
              lastParam,
              lastParam.valueDeclaration!,
            );
            let paramTypeNode = checker.typeToTypeNode(paramType);
            if (paramTypeNode !== undefined && ts.isTypeReferenceNode(paramTypeNode)) {
              paramType = checker.getTypeFromTypeNode(paramTypeNode);
              paramTypeNode = checker.typeToTypeNode(paramType);
            }
            if (paramTypeNode) {
              if (ts.isFunctionTypeNode(paramTypeNode)) {
                const firstParam = paramTypeNode.parameters[0];
                const firstParamSymbol = checker.getSymbolAtLocation(firstParam.name);
                if (firstParamSymbol) {
                  const str = checker.symbolToString(firstParamSymbol);
                  if (str.match(/(^e$|^e(r|x)+.*)/)) {
                    baseState.escapin.types.put(t.errorFirstCallback(...names));
                  } else {
                    baseState.escapin.types.put(t.generalCallback(...names));
                  }
                }
              } else {
                const returnType = signature.getReturnType();
                const returnSymbol = returnType.getSymbol();
                if (returnSymbol) {
                  const returnName = checker.symbolToString(returnSymbol);
                  if (returnName === 'Promise') {
                    baseState.escapin.types.put(t.asynchronous(...names));
                  } else {
                    baseState.escapin.types.put(t.general(...names));
                  }
                }
              }
            }
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }
}
