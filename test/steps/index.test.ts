import test from 'ava';
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
import { compare } from '../util';

test('[normalize.1] nominal case of normalize', async t => {
  await compare(t, 'normalize.1', normalize);
});

test('[uncallbackify.1] nominal case of uncallbackify', async t => {
  await compare(t, 'uncallbackify.1', uncallbackify);
});

test('[openApiV2.1] nominal case of openApiV2', async t => {
  await compare(t, 'openApiV2.1', openApiV2, finalize);
});

test('[openApiV2.2] ignore conventional import declarations', async t => {
  await compare(t, 'openApiV2.2', openApiV2, finalize);
});

test('[refineObject.1] nominal case of refineObject', async t => {
  await compare(t, 'refineObject.1', refineObject, finalize);
});

test('[refineFunction.1] nominal case of refineFunction', async t => {
  await compare(t, 'refineFunction.1', refineFunction, finalize);
});

test('[asynchronize.1] nominal case of asynchronize', async t => {
  await compare(t, 'asynchronize.1', functionTypes, asynchronize, finalize);
});

test('[finalize.1] nominal case of finalize', async t => {
  await compare(t, 'finalize.1', finalize);
});
