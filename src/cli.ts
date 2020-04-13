#!/usr/bin/env node

import boxen from 'boxen';
import chalk from 'chalk';
import program from 'commander';
import path from 'path';
import { Escapin } from '.';
import { getLatestVersion } from './util';
import pkg from '../package.json';

function dir(val: string): string {
  return path.resolve(val);
}

function doTranspileProcess(options: { dir: string; ignorePath: string }): void {
  const { dir, ignorePath } = options;

  console.log(`working directory: ${dir}`);
  console.log(`path of ignore file: ${ignorePath}`);

  const escapin = new Escapin(dir, ignorePath);

  try {
    escapin.transpile();
  } catch (err) {
    console.error(err);
    // eslint-disable-next-line no-process-exit
    process.exit(-1);
  }
}

function main(): void {
  const latestVersion = getLatestVersion('escapin');
  if (pkg.version !== latestVersion) {
    const message = boxen(
      `Update available
Current: ${chalk.dim(pkg.version)}
Latest:  ${chalk.green(latestVersion)}`,
      {
        padding: 1,
        margin: 1,
        align: 'center',
      },
    );
    console.error(message);
  }

  program.version(pkg.version);

  program
    .description('Transpile source code')
    .option('-d, --dir <dir>', 'working directory', dir, '.')
    .option('--ignore-path <path>', 'specify path of ignore file', '.gitignore')
    .action(doTranspileProcess)
    .on('--help', function() {
      console.log('escapin [-d <dir>]');
    });

  program.parse(process.argv);
}

main();
