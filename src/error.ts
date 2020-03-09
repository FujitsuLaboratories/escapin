import { codeFrameColumns } from '@babel/code-frame';
import { Node } from '@babel/types';
import { BaseState } from './state';
import * as u from './util';

export class EscapinSyntaxError extends Error {
  constructor(msg: string, target: Node, state: BaseState) {
    const loc = target.loc || { start: { line: 1, column: 1 } };
    console.log(u.generate(target));
    super(
      `${msg}\n${codeFrameColumns(state.code, loc, {
        highlightCode: true,
      })}`,
    );
  }
}
