import {
  normalize,
  uncallbackify,
  openApiV2,
  refineObject,
  refineFunction,
  functionTypes,
  asynchronize,
  finalize,
} from '../../src/steps';
import { transpile } from '../util';

test('[normalize.1] nominal case of normalize', async () => {
  const { actual, expected } = await transpile('normalize.1', normalize);
  expect(actual).toEqual(expected);
});

test('[uncallbackify.1] nominal case of uncallbackify', async () => {
  const { actual, expected } = await transpile('uncallbackify.1', uncallbackify);
  expect(actual).toEqual(expected);
});

test('[openApiV2.1] nominal case of openApiV2', async () => {
  const { actual, expected } = await transpile('openApiV2.1', openApiV2, finalize);
  expect(actual).toEqual(expected);
});

test('[openApiV2.2] ignore conventional import declarations', async () => {
  const { actual, expected } = await transpile('openApiV2.2', openApiV2, finalize);
  expect(actual).toEqual(expected);
});

test('[refineObject.1] nominal case of refineObject', async () => {
  const { actual, expected } = await transpile('refineObject.1', refineObject, finalize);
  expect(actual).toEqual(expected);
});

test('[refineFunction.1] nominal case of refineFunction', async () => {
  const { actual, expected } = await transpile('refineFunction.1', refineFunction, finalize);
  expect(actual).toEqual(expected);
});

test('[asynchronize.1] nominal case of asynchronize', async () => {
  const { actual, expected } = await transpile(
    'asynchronize.1',
    functionTypes,
    asynchronize,
    finalize,
  );
  expect(actual).toEqual(expected);
});

test('[finalize.1] nominal case of finalize', async () => {
  const { actual, expected } = await transpile('finalize.1', finalize);
  expect(actual).toEqual(expected);
});
