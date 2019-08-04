import test from 'ava';
import * as c from '../../src/util';
import step from '../../src/steps/refineFunction';
import { BaseState } from '../../src/state';
import { Escapin } from '../../src';

test('test function', t => {
  const before = `
export const csvGET = (req) => {
  return 'hello';
}
  `;

  const after = `
export const csvGET = (req, context, callback) => {
  try {
    callback(null, 'hello');
    return;
  } catch (err) {
    callback(new Error(\`500: $\{err}\`));
  }
}
`;

  const astBefore = c.parse(before);

  const state = new BaseState();
  state.filename = 'test';
  state.code = before;
  state.ast = astBefore;
  state.escapin = new Escapin('test');
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
  state.escapin.config = {
    name: 'test',
    platform: 'aws',
    output_dir: 'test',
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

  step(state);

  const astAfter = c.parse(after);

  t.deepEqual(c.purify(astBefore), c.purify(astAfter));
});
