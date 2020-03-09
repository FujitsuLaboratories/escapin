/* eslint-disable @typescript-eslint/camelcase */
import { Visitor } from '@babel/traverse';
import { commandSync } from 'execa';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as ts from 'typescript';
import { installTypes } from 'types-installer';
import { BaseState } from '../../state';
import * as t from '../../types';
import * as u from '../../util';
import visit from './visit';

function newVisitor(): Visitor<BaseState> {
  let done = false;
  return {
    Program(path, state): void {
      if (!done) {
        const { escapin } = state;
        const { output_dir } = escapin.config;

        escapin.save();
        commandSync('npm install', {
          cwd: output_dir,
          stdout: process.stdout,
        });

        const { dependencies, devDependencies } = escapin.packageJson;
        installTypesInDependencies(dependencies, devDependencies, output_dir);

        const packageJson = JSON.parse(readFileSync(join(output_dir, 'package.json'), 'utf8'));
        escapin.packageJson = packageJson;

        for (const filename in escapin.states) {
          checkFunctionTypes(escapin.types, filename, output_dir);
        }

        for (const entry of escapin.types.getAll()) {
          console.log(entry);
        }

        path.skip();
        done = true;
      }
    },
  };
}

function installTypesInDependencies(
  dependencies: { [moduleName: string]: string },
  devDependencies: { [moduleName: string]: string },
  pwd: string,
): void {
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

function checkFunctionTypes(types: t.TypeDictionary, filename: string, output_dir: string): void {
  const program = ts.createProgram([join(output_dir, filename)], {
    allowJs: true,
    typeRoots: [join(output_dir, 'node_modules')],
  });
  const checker = program.getTypeChecker();
  for (const sourceFile of program.getSourceFiles()) {
    if (!sourceFile.isDeclarationFile) {
      ts.forEachChild(sourceFile, visit(types, checker));
    }
  }

  // TODO: find out the below types from the AST
  types.put(t.errorFirstCallback('request'));
}

export default newVisitor();
