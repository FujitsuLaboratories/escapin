import { difference, uniq } from 'lodash';
import * as u from './util';

export interface FunctionType {
  names: string[];
  type: 'asynchronous' | 'error-first-callback' | 'general-callback' | 'general';
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

export function isAsynchronous(entry: FunctionType | undefined): entry is Asynchronous {
  return entry?.type === 'asynchronous';
}

export function isErrorFirstCallback(entry: FunctionType | undefined): entry is ErrorFirstCallback {
  return entry?.type === 'error-first-callback';
}

export function isGeneralCallback(entry: FunctionType | undefined): entry is GeneralCallback {
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

export function getNames(path: u.NodePath): string[] {
  const names: string[] = [];
  if (path.isIdentifier()) {
    names.push(path.node.name);
  }
  path.traverse({
    Identifier(path) {
      names.push(path.node.name);
    },
  });
  return uniq(names);
}

export class TypeDictionary {
  private types: FunctionType[];
  constructor() {
    this.types = [];
  }

  public getAll(): FunctionType[] {
    return this.types;
  }

  public get(...names: string[]): FunctionType | undefined {
    return this.types.find(entry => 0 === difference(entry.names, names).length);
  }

  public put(entry: FunctionType) {
    const elder = this.get(...entry.names);
    if (elder) {
      elder.type = entry.type;
    } else {
      this.types.push(entry);
    }
  }
}
