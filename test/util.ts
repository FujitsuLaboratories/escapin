import { ExecutionContext } from 'ava';
import _mkdirp from 'mkdirp';
import { sync as rimraf } from 'rimraf';
import { promisify } from 'util';
import { v4 as uuid } from 'uuid';
import * as c from '../src/util';
import { BaseState } from '../src/state';
import { Escapin } from '../src';
import * as types from '../src/types';

const mkdirp = promisify(_mkdirp);

export async function compare(
  t: ExecutionContext,
  before: string,
  after: string,
  ...steps: Array<(state: BaseState) => void>
) {
  const state = new BaseState();
  state.filename = 'test';
  state.dependencies = {};
  state.escapin = new Escapin(process.cwd());
  state.escapin.id = 'test';
  state.escapin.config = {
    name: 'test',
    platform: 'aws',
    // eslint-disable-next-line no-undef
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

  await mkdirp(state.escapin.config.output_dir);

  try {
    const astBefore = c.parse(before);
    state.code = before;
    state.ast = astBefore;

    for (const step of steps) {
      step(state);
    }

    const astAfter = c.parse(after);

    t.deepEqual(c.purify(astBefore), c.purify(astAfter));
  } catch (err) {
    console.error(err);
    t.fail();
  } finally {
    rimraf(state.escapin.config.output_dir);
  }
}
