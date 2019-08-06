import test from 'ava';
import fs from 'fs';
import _mkdirp from 'mkdirp';
import { ncp as _ncp } from 'ncp';
import path from 'path';
import { sync as rimraf } from 'rimraf';
import { promisify } from 'util';
import { Escapin } from '../src';

const mkdirp = promisify(_mkdirp);
const ncp = promisify(_ncp);

const EXAMPLES_DIR = path.join(process.cwd(), 'examples');
// eslint-disable-next-line no-undef
const TEMP_DIR = path.join(__dirname, 'temp');

test.before(async t => {
  if (fs.existsSync(TEMP_DIR)) {
    rimraf(TEMP_DIR);
  }
  await mkdirp(TEMP_DIR);
  await ncp(EXAMPLES_DIR, TEMP_DIR);
});

test.after(t => {
  if (fs.existsSync(TEMP_DIR)) {
    rimraf(TEMP_DIR);
  }
});

test.serial('test index', async t => {
  const names = fs.readdirSync(TEMP_DIR, 'utf8');
  for (const name of names) {
    const cwd = path.join(TEMP_DIR, name);
    const stat = fs.lstatSync(cwd);
    if (!stat.isDirectory()) {
      continue;
    }
    const escapin = new Escapin(cwd);
    await escapin.transpile();
  }
  t.pass();
});
