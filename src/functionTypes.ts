import { difference, uniq } from 'lodash';
import { FunctionType } from './types';
import * as u from './util';

export function getNames<T>(path: u.NodePath<T>): string[] {
  const names: string[] = [];
  if (path.isIdentifier()) {
    names.push(path.node.name);
  }
  path.traverse({
    Identifier(path) {
      names.push(path.node.name);
    },
    Statement(path) {
      path.skip();
    },
    Function(path) {
      path.skip();
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
    return this.types.find(
      entry => 0 === difference(entry.names, names).length,
    );
  }

  public put(entry: FunctionType): void {
    const elder = this.get(...entry.names);
    if (elder) {
      elder.type = entry.type;
    } else {
      this.types.push(entry);
    }
  }
}
