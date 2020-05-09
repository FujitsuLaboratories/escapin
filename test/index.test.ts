import { expect } from 'chai';
import deasync from 'deasync';
import fs from 'fs';
import { sync as mkdirp } from 'mkdirp';
import { ncp as _ncp } from 'ncp';
import path from 'path';
import { sync as rimraf } from 'rimraf';
import { Escapin } from '../src';

const ncp = deasync(_ncp);

const EXAMPLES_DIR = path.join(process.cwd(), 'examples');
// eslint-disable-next-line no-undef
const TEMP_DIR = path.join(__dirname, 'temp');

const PROJECTS = ['sendmail', 'thumbnail'];

describe('Escapin', function () {
  this.timeout(0);

  before(() => {
    if (fs.existsSync(TEMP_DIR)) {
      rimraf(TEMP_DIR);
    }
    mkdirp(TEMP_DIR);
    ncp(EXAMPLES_DIR, TEMP_DIR);
  });

  after(() => {
    if (fs.existsSync(TEMP_DIR)) {
      rimraf(TEMP_DIR);
    }
  });

  PROJECTS.forEach(project => {
    it(`should transpile all projects in ./examples/${project}`, () => {
      expect(() =>
        new Escapin(path.join(TEMP_DIR, project)).transpile(),
      ).to.not.throw();
    });
  });
});
