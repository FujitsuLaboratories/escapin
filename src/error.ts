import { codeFrameColumns } from '@babel/code-frame';
import { Node } from '@babel/types';
import { BaseState } from './state';

export class SyntaxError extends Error {
  constructor(msg: string, target: Node, state: BaseState) {
    const loc = target.loc || { start: { line: 1, column: 1 } };
    super(
      `${msg}\n${codeFrameColumns(state.code, loc, {
        highlightCode: true,
      })}`,
    );
  }
}
