import fs from 'fs';
import _mkdirp from 'mkdirp';
import path from 'path';
import { sync as rimraf } from 'rimraf';
import { promisify } from 'util';
import { v4 as uuid } from 'uuid';
import * as u from '../src/util';
import { BaseState } from '../src/state';
import { Escapin } from '../src';
import * as types from '../src/types';

const mkdirp = promisify(_mkdirp);

export function initialize() {
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
  escapin.types = new types.TypeDictionary();
  escapin.types.put(types.asynchronous('asyncFunc'));
  escapin.types.put(types.errorFirstCallback('errorFirstCallbackFunc'));
  escapin.types.put(types.generalCallback('generalCallbackFunc'));
  escapin.types.put(types.general('generalFunc'));
  return escapin;
}

export async function transpile(
  testName: string,
  ...steps: Array<(escapin: Escapin) => void>
): Promise<{
  actual: u.Node;
  expected: u.Node;
}> {
  const escapin = initialize();
  await mkdirp(escapin.config.output_dir);

  const actual = fs.readFileSync(path.join(__dirname, `steps/${testName}.in.js`), 'utf8');
  const expected = fs.readFileSync(path.join(__dirname, `steps/${testName}.out.js`), 'utf8');

  try {
    const astActual = u.parse(actual);
    escapin.states['dummy.js'].code = actual;
    escapin.states['dummy.js'].ast = astActual;

    for (const step of steps) {
      step(escapin);
    }

    const astExpected = u.parse(expected);

    return Promise.resolve({ actual: u.purify(astActual), expected: u.purify(astExpected) });
  } finally {
    rimraf(escapin.config.output_dir);
  }
}
