import fs from 'fs';
import { sync as mkdirp } from 'mkdirp';
import { ncp as _ncp } from 'ncp';
import path from 'path';
import { sync as rimraf } from 'rimraf';
import { promisify } from 'util';
import { Escapin } from '../src';

const ncp = promisify(_ncp);

const EXAMPLES_DIR = path.join(process.cwd(), 'examples');
// eslint-disable-next-line no-undef
const TEMP_DIR = path.join(__dirname, 'temp');

test('transpiles all projects in ./examples', async done => {
  try {
    if (fs.existsSync(TEMP_DIR)) {
      rimraf(TEMP_DIR);
    }
    mkdirp(TEMP_DIR);
    await ncp(EXAMPLES_DIR, TEMP_DIR);

    const names = fs.readdirSync(TEMP_DIR, 'utf8');
    for (const name of names) {
      const cwd = path.join(TEMP_DIR, name);
      const stat = fs.lstatSync(cwd);
      if (!stat.isDirectory()) {
        continue;
      }
      await expect(
        new Promise((resolve, reject) => {
          try {
            const escapin = new Escapin(cwd);
            escapin.transpile();
            resolve(true);
          } catch (e) {
            reject(e);
          }
        }),
      ).toBeTruthy();
    }
  } catch (e) {
    console.error(e);
    throw e;
  } finally {
    if (fs.existsSync(TEMP_DIR)) {
      rimraf(TEMP_DIR);
    }
    done();
  }
}, 300000);
