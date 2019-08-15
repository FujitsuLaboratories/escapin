import { Scope } from '@babel/traverse';
import * as t from '@babel/types';
import fs from 'fs';
import module from 'module';
import { OpenAPIV2 } from 'openapi-types';
import Path from 'path';
import { Escapin } from '.';
import * as u from './util';

export const EXTENSIONS = ['.js', '.mjs', '.jsx'];

export interface IPathInfo {
  name: string;
  path: string;
  method: string;
  consumes: string[];
  produces: string[];
  parameters: OpenAPIV2.Parameters;
}

export class BaseState {
  public escapin: Escapin;
  public replacements: Array<{ original: u.Node; replaced: u.Node; scope: Scope }>;
  public filename: string;
  public code: string;
  public ast: t.File;

  constructor(base?: BaseState) {
    if (base) {
      for (const key in base) {
        this[key] = base[key];
      }
      return;
    }
    this.replacements = [];
  }

  public getPathInfo(functionName: string): IPathInfo | undefined {
    if (this.escapin === undefined || this.escapin.apiSpec === undefined) {
      return undefined;
    }
    const apiSpec = this.escapin.apiSpec.data;
    const name = `${apiSpec.info.title}-${this.escapin.id}`;
    for (const path in apiSpec.paths) {
      const resource = apiSpec.paths[path] as OpenAPIV2.PathItemObject;
      for (const method in resource) {
        const info = resource[method] as OpenAPIV2.OperationObject;
        const handler = info['x-escapin-handler'] as string;
        if (handler === `${Path.basename(this.filename, '.js')}.${functionName}`) {
          return {
            name,
            path,
            method,
            consumes: info.consumes || [],
            produces: info.produces || [],
            parameters: info.parameters || [],
          };
        }
      }
    }
    return undefined;
  }

  public pushProgramBody(snippet: u.OneOrMore<u.Statement>) {
    if (Array.isArray(snippet)) {
      this.ast.program.body.push(...snippet);
    } else {
      this.ast.program.body.push(snippet);
    }
  }

  public unshiftProgramBody(snippet: u.OneOrMore<u.Statement>) {
    if (Array.isArray(snippet)) {
      this.ast.program.body.unshift(...snippet);
    } else {
      this.ast.program.body.unshift(snippet);
    }
  }

  public resolvePath(file: string): string | undefined {
    const currentPath = Path.dirname(Path.join(this.escapin.basePath, this.filename));
    file = Path.join(currentPath, file);
    if (fs.existsSync(file)) {
      return file;
    }
    for (const ext of EXTENSIONS) {
      const fileWithExt = `${file}${ext}`;
      if (fs.existsSync(fileWithExt)) {
        return fileWithExt;
      }
    }
    return undefined;
  }

  public addDependency(moduleName: string) {
    this.escapin.addDependency(moduleName);
    this.unshiftProgramBody(u.snippetFor(moduleName));
  }

  public hasDependency(moduleName: string): boolean {
    if (module.builtinModules.includes(moduleName)) {
      return true;
    }
    if (this.escapin === undefined || this.escapin.packageJson === undefined) {
      return false;
    }
    const {
      dependencies,
      devDependencies,
      peerDependencies,
      optionalDependencies,
      bundledDependencies,
    } = this.escapin.packageJson;
    return (
      moduleName in
      Object.assign(
        dependencies,
        devDependencies,
        peerDependencies,
        optionalDependencies,
        bundledDependencies,
      )
    );
  }
}
