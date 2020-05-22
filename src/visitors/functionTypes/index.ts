import { Visitor } from '@babel/traverse';
import { commandSync } from 'execa';
import { join } from 'path';
import * as ts from 'typescript';
import { TypeDictionary } from '../../functionTypes';
import { BaseState } from '../../state';
import { errorFirstCallback } from '../../types';
import { getLatestVersion } from '../../util';
import { getTypings } from './typings';
import { newVisit } from './visit';

function newVisitor(): Visitor<BaseState> {
  let done = false;
  return {
    Program(path, state): void {
      if (!done) {
        const { escapin } = state;
        const { output_dir } = escapin.config;

        escapin.save();

        const { dependencies, devDependencies } = escapin.packageJson;
        const modules = Object.keys(dependencies).concat(
          Object.keys(devDependencies),
        );

        getTypings(modules).forEach(typing => {
          devDependencies[typing] = getLatestVersion(typing);
        });

        escapin.savePackageJson();

        commandSync('npm install', {
          cwd: output_dir,
          stdout: process.stdout,
        });

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

function checkFunctionTypes(
  types: TypeDictionary,
  filename: string,
  output_dir: string,
): void {
  const program = ts.createProgram([join(output_dir, filename)], {
    allowJs: true,
    typeRoots: [join(output_dir, 'node_modules')],
  });
  const checker = program.getTypeChecker();
  program.getSourceFiles().forEach(sourceFile => {
    if (!sourceFile.isDeclarationFile) {
      ts.forEachChild(sourceFile, newVisit(types, checker));
    }
  });

  // TODO: find out the below types from the AST
  types.put(errorFirstCallback('request'));
}

export default newVisitor();
