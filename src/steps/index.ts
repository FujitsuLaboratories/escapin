import normalize from './normalize';
import uncallbackify from './uncallbackify';
import openApiV2 from './openApiV2';
import refineObject from './refineObject';
import refineFunction from './refineFunction';
import functionTypes from './functionTypes';
import asynchronize from './asynchronize';
import finalize from './finalize';

const steps = [
  normalize,
  uncallbackify,
  openApiV2,
  refineObject,
  refineFunction,
  functionTypes,
  asynchronize,
  finalize,
];

export {
  normalize,
  uncallbackify,
  openApiV2,
  refineObject,
  refineFunction,
  functionTypes,
  asynchronize,
  finalize,
  steps,
};
