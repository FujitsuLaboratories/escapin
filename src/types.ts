import { OpenAPIV2 } from 'openapi-types';

export type OneOrMore<T> = T | T[];

export interface Config {
  name: string;
  platform: string;
  default_storage: string;
  output_dir: string;
  api_spec?: string;
  credentials?: Credential[];
}

export interface Credential {
  api: string;
  [x: string]: string;
}

export interface PackageJson {
  main?: string;
  scripts?: { [script: string]: string };
  dependencies: { [moduleName: string]: string };
  devDependencies: { [moduleName: string]: string };
  peerDependencies?: { [moduleName: string]: string };
  optionalDependencies?: { [moduleName: string]: string };
  bundledDependencies?: string[];
  types?: string;
  typings?: string;
  [key: string]: any;
}

export interface ServerlessConfig {
  service?: string;
  provider?: any;
  functions?: { [name: string]: any };
  resources?: { [name: string]: any };
}

export interface PathInfo {
  name: string;
  path: string;
  method: string;
  consumes: string[];
  produces: string[];
  parameters: OpenAPIV2.Parameters;
}

export interface FunctionType {
  names: string[];
  type:
    | 'asynchronous'
    | 'error-first-callback'
    | 'general-callback'
    | 'general';
}

export interface Asynchronous extends FunctionType {
  type: 'asynchronous';
}

export interface ErrorFirstCallback extends FunctionType {
  type: 'error-first-callback';
}

export interface GeneralCallback extends FunctionType {
  type: 'general-callback';
}

export interface General extends FunctionType {
  type: 'general';
}

export function isAsynchronous(
  entry: FunctionType | undefined,
): entry is Asynchronous {
  return entry?.type === 'asynchronous';
}

export function isErrorFirstCallback(
  entry: FunctionType | undefined,
): entry is ErrorFirstCallback {
  return entry?.type === 'error-first-callback';
}

export function isGeneralCallback(
  entry: FunctionType | undefined,
): entry is GeneralCallback {
  return entry?.type === 'general-callback';
}

export function isGeneral(entry: FunctionType | undefined): entry is General {
  return entry?.type === 'general';
}

export function asynchronous(...names: string[]): Asynchronous {
  return { type: 'asynchronous', names };
}

export function errorFirstCallback(...names: string[]): ErrorFirstCallback {
  return { type: 'error-first-callback', names };
}

export function generalCallback(...names: string[]): GeneralCallback {
  return { type: 'general-callback', names };
}

export function general(...names: string[]): General {
  return { type: 'general', names };
}
