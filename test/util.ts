/* eslint-disable @typescript-eslint/camelcase */
import fs from 'fs';
import { sync as mkdirp } from 'mkdirp';
import path from 'path';
import { sync as rimraf } from 'rimraf';
import { v4 as uuid } from 'uuid';
import { TypeDictionary } from '../src/functionTypes';
import { BaseState } from '../src/state';
import { asynchronous, errorFirstCallback, general, generalCallback } from '../src/types';
import * as u from '../src/util';
import { Escapin } from '../src';
import { Visitor } from '@babel/traverse';

export function initialize(): Escapin {
  const state = new BaseState();
  state.filename = 'dummy.js';
  const escapin = new Escapin(process.cwd());
  escapin.states = {
    'dummy.js': state,
  };
  state.escapin = escapin;
  escapin.id = 'test';
  escapin.config = {
    name: 'test',
    platform: 'aws',
    default_storage: 'table',
    output_dir: `${__dirname}/${uuid()}`,
  };
  escapin.apiSpec = {
    file: 'test.json',
    data: {
      swagger: '2.0',
      info: {
        title: 'test',
        version: 'v1',
      },
      paths: {
        '/handle': {
          get: {
            'x-escapin-handler': 'dummy.handle',
            consumes: ['application/json'],
          },
        },
      },
    },
  };
  escapin.serverlessConfig = {
    service: escapin.config.name,
    provider: {
      name: escapin.config.platform,
      runtime: 'nodejs10.x',
      stage: 'dev',
      apiKeys: {},
    },
    functions: {},
    resources: {},
  };
  escapin.packageJson = {
    dependencies: {},
    devDependencies: {},
  };
  escapin.types = new TypeDictionary();
  escapin.types.put(asynchronous('asyncFunc'));
  escapin.types.put(errorFirstCallback('errorFirstCallbackFunc'));
  escapin.types.put(generalCallback('generalCallbackFunc'));
  escapin.types.put(general('generalFunc'));
  return escapin;
}

export function transpile(
  testName: string,
  ...visitors: Visitor<BaseState>[]
): {
  actual: u.Node;
  expected: u.Node;
} {
  const escapin = initialize();
  mkdirp(escapin.config.output_dir);

  const actual = fs.readFileSync(path.join(__dirname, `visitors/${testName}.in.js`), 'utf8');
  const expected = fs.readFileSync(path.join(__dirname, `visitors/${testName}.out.js`), 'utf8');

  try {
    const astActual = u.parse(actual);
    const state = escapin.states['dummy.js'];
    state.code = actual;
    state.ast = astActual;

    for (const visitor of visitors) {
      u.traverse(visitor, state);
    }

    const astExpected = u.parse(expected);

    return { actual: u.purify(astActual), expected: u.purify(astExpected) };
  } finally {
    rimraf(escapin.config.output_dir);
  }
}
