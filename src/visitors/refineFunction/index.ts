import { Visitor } from '@babel/traverse';
import Path from 'path';
import { BaseState, PathInfo } from '../../state';
import * as u from '../../util';
import aws from './aws';

function newVisitor(
  platform: string,
): (stmtPath: u.NodePath, func: u.Function, info: PathInfo) => Visitor<BaseState> {
  const visitors = { aws };
  return visitors[platform];
}

const visitor: Visitor<BaseState> = {
  Function(path, state) {
    const func = path.node;
    const stmtPath = path.isExpression() ? path.findParent(path => path.isStatement()) : path;
    const id = u.getFunctionId(stmtPath, func);
    if (id === undefined) {
      return;
    }

    const { name } = id;

    const info = state.getPathInfo(name);
    if (info === undefined) {
      return;
    }

    const handler = `${Path.basename(state.filename, Path.extname(state.filename))}.${name}`;
    const { platform } = state.escapin.config;

    state.escapin.addServerlessConfig(`${platform}.function`, {
      name,
      handler,
    });
    state.escapin.addServerlessConfig(`${platform}.function.http`, {
      name,
      path: info.path.substring(1),
      method: info.method,
    });

    u.traverse(newVisitor(platform)(stmtPath, func, info), state);
  },
};

export default visitor;