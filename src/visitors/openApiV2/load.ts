import fs from 'fs';
import { OpenAPI } from 'openapi-types';
import { join } from 'path';
import { sync as rimraf } from 'rimraf';
import { dereference } from 'swagger-parser';
import isURL from 'validator/lib/isURL';
import { BaseState } from '../../state';
import { deasyncPromise, fetch } from '../../util';

export function loadOpenApiV2(uri: string, state: BaseState): OpenAPI.Document | null {
  let spec = null;
  try {
    let resolved;
    let cleanupNeeded = false;
    if (isURL(uri)) {
      const response = fetch(uri);
      resolved = join(state.escapin.config.output_dir, encodeURIComponent(uri));
      fs.writeFileSync(resolved, response);
      cleanupNeeded = true;
    } else {
      resolved = state.resolvePath(uri);
      if (resolved === undefined) {
        throw new Error(`${uri} not found.`);
      } else if (!fs.existsSync(resolved)) {
        throw new Error(`${resolved} not found.`);
      }
    }
    spec = deasyncPromise(dereference(resolved));
    if (cleanupNeeded) {
      rimraf(resolved);
    }
  } catch (err) {
    if (state.hasDependency(uri)) {
      console.log(`${uri} is a module.`);
    }
    const index = uri.lastIndexOf('/');
    const actualUri = index > 0 ? uri.substring(0, uri.lastIndexOf('/')) : uri;
    if (state.hasDependency(actualUri)) {
      console.log(`${actualUri} is a module.`);
    } else if (fs.existsSync(actualUri)) {
      console.log(`${actualUri} is a local module.`);
    } else {
      throw err;
    }
  }
  return spec;
}
