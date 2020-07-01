import { Visitor } from '@babel/traverse';
import { commandSync } from 'execa';
import * as fs from 'fs';
import { join } from 'path';
import ts from 'typescript';
import { TypeDictionary } from '../../functionTypes';
import { BaseState } from '../../state';
import { errorFirstCallback } from '../../types';
import { getLatestVersion } from '../../util';
import { getTypings } from './typings';
import { newVisit } from './visit';

const visitor: Visitor<BaseState> = {
  Program(path, state): void {
    const { escapin } = state;
    const { output_dir } = escapin.config;

    escapin.save();

    if (!fs.existsSync(`${output_dir}/node_modules`)) {
      const { dependencies, devDependencies } = escapin.packageJson;
      const modules = [
        ...Object.keys(dependencies),
        ...Object.keys(devDependencies),
      ];

      getTypings(modules).forEach(typing => {
        devDependencies[typing] = getLatestVersion(typing);
      });

      escapin.savePackageJson();

      commandSync('npm install', {
        cwd: output_dir,
        stdout: process.stdout,
      });
    }

    checkFunctionTypes(escapin.types, state.filename, output_dir);

    if (process.env.NODE_ENV === 'test') {
      console.log(state.filename);
      for (const entry of escapin.types.getAll()) {
        console.log(entry);
      }
    }

    path.skip();
  },
};

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

export default visitor;
