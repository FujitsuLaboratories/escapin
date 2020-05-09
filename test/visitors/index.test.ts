import { expect } from 'chai';
import {
  normalize,
  uncallbackify,
  openApiV2,
  refineObject,
  refineFunction,
  functionTypes,
  asynchronize,
  finalize,
} from '../../src/visitors';
import { transpile } from '../util';

describe('visitors', function () {
  this.timeout(0);

  it('[normalize.1] nominal case of normalize', () => {
    const { actual, expected } = transpile('normalize.1', {}, normalize);
    expect(actual).to.eql(expected);
  });

  it('[uncallbackify.1] nominal case of uncallbackify', () => {
    const { actual, expected } = transpile(
      'uncallbackify.1',
      {},
      uncallbackify,
    );
    expect(actual).to.eql(expected);
  });

  it('[openApiV2.1] ignore conventional import declarations', () => {
    const { actual, expected } = transpile(
      'openApiV2.1',
      {},
      openApiV2,
      finalize,
    );
    expect(actual).to.eql(expected);
  });

  it('[openApiV2.2] nominal case of openApiV2 with axios', () => {
    const { actual, expected } = transpile(
      'openApiV2.2',
      {},
      openApiV2,
      finalize,
    );
    expect(actual).to.eql(expected);
  });

  it('[openApiV2.3] nominal case of openApiV2 with request', () => {
    const { actual, expected } = transpile(
      'openApiV2.3',
      // eslint-disable-next-line @typescript-eslint/camelcase
      { http_client: 'request' },
      openApiV2,
      finalize,
    );
    expect(actual).to.eql(expected);
  });

  it('[refineObject.1] nominal case of refineObject', () => {
    const { actual, expected } = transpile(
      'refineObject.1',
      {},
      refineObject,
      finalize,
    );
    expect(actual).to.eql(expected);
  });

  it('[refineFunction.1] nominal case of refineFunction', () => {
    const { actual, expected } = transpile(
      'refineFunction.1',
      {},
      refineFunction,
      finalize,
    );
    expect(actual).to.eql(expected);
  });

  it('[asynchronize.1] nominal case of asynchronize', () => {
    const { actual, expected } = transpile(
      'asynchronize.1',
      {},
      functionTypes,
      asynchronize,
      finalize,
    );
    expect(actual).to.eql(expected);
  });

  it('[finalize.1] nominal case of finalize', () => {
    const { actual, expected } = transpile('finalize.1', {}, finalize);
    expect(actual).to.eql(expected);
  });
});
