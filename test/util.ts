import { ExecutionContext } from 'ava';
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

export function initializeState() {
  const state = new BaseState();
  state.filename = 'test.js';
  state.escapin = new Escapin(process.cwd());
  state.escapin.id = 'test';
  state.escapin.config = {
    name: 'test',
    platform: 'aws',
    output_dir: `${__dirname}/${uuid()}`,
  };
  state.escapin.apiSpec = {
    file: 'test.json',
    data: {
      swagger: '2.0',
      info: {
        title: 'test',
        version: 'v1',
      },
      paths: {
        '/csv': {
          get: {
            'x-escapin-handler': 'test.csvGET',
            consumes: ['application/json'],
          },
        },
      },
    },
  };
  state.escapin.serverlessConfig = {
    service: state.escapin.config.name,
    provider: {
      name: state.escapin.config.platform,
      runtime: 'nodejs10.x',
      stage: 'dev',
      apiKeys: {},
    },
    functions: {},
    resources: {},
  };
  state.escapin.packageJson = {
    dependencies: {},
    devDependencies: {},
  };
  state.escapin.types = new types.TypeDictionary();
  state.escapin.types.put(types.asynchronous('asyncFunc'));
  state.escapin.types.put(types.errorFirstCallback('errorFirstCallbackFunc'));
  state.escapin.types.put(types.generalCallback('generalCallbackFunc'));
  state.escapin.types.put(types.general('generalFunc'));
  return state;
}

export async function compare(
  t: ExecutionContext,
  testName: string,
  ...steps: Array<(state: BaseState) => void>
) {
  const state = initializeState();
  await mkdirp(state.escapin.config.output_dir);

  const before = fs.readFileSync(path.join(__dirname, `steps/${testName}.in.js`), 'utf8');
  const after = fs.readFileSync(path.join(__dirname, `steps/${testName}.out.js`), 'utf8');

  try {
    const astBefore = u.parse(before);
    state.code = before;
    state.ast = astBefore;

    for (const step of steps) {
      step(state);
    }

    const astAfter = u.parse(after);

    t.deepEqual(u.purify(astBefore), u.purify(astAfter));
  } catch (err) {
    console.error(err);
    t.fail();
  } finally {
    rimraf(state.escapin.config.output_dir);
  }
}
