#!/usr/bin/env node

import program from 'commander';
import fs from 'fs';
import path from 'path';
import { Escapin } from '.';

function dir(val: string): string {
  return path.resolve(val);
}

function main() {
  const packageJson = JSON.parse(
    // eslint-disable-next-line no-undef
    fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8'),
  );

  program.version(packageJson.version);

  program
    .description('Transpile source code')
    .option('-d, --dir <dir>', 'Working directory', dir, process.cwd())
    .action(doTranspileProcess)
    .on('--help', function() {
      console.log('escapin [-d <dir>]');
    });

  program.parse(process.argv);
}

main();

async function doTranspileProcess(options: { dir: string }) {
  const { dir } = options;

  console.log(`dir: ${dir}`);

  const escapin = new Escapin(dir);
  await escapin.transpile();
}
