import fs from 'fs';
import { OpenAPI } from 'openapi-types';
import { join } from 'path';
import { sync as rimraf } from 'rimraf';
import { dereference } from 'swagger-parser';
import isURL from 'validator/lib/isURL';
import { BaseState } from '../../state';
import { deasyncPromise, fetch } from '../../util';

export function loadOpenApiV2(
  uri: string,
  state: BaseState,
): OpenAPI.Document | null {
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
      if (resolved === undefined || !fs.existsSync(resolved)) {
        return null;
      }
    }
    spec = deasyncPromise(dereference(resolved));
    if (cleanupNeeded) {
      rimraf(resolved);
    }
  } catch (err) {
    console.error(err);
    return null;
  }
  return spec;
}
