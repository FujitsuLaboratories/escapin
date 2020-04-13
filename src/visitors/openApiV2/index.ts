/* eslint-disable @typescript-eslint/camelcase */
import { Visitor } from '@babel/traverse';
import { BaseState } from '../../state';
import { HttpMethod } from '../../types';
import * as u from '../../util';
import axios from './axios';
import { loadOpenApiV2 } from './load';
import request from './request';
import { OpenAPIV2 } from 'openapi-types';

function _modifySnippets(
  http_client: string,
): (
  method: HttpMethod,
  key: u.Identifier,
  spec: OpenAPIV2.Document,
  state: BaseState,
  path: u.NodePath,
  target: u.NodePath,
  data?: u.Node,
) => void {
  return { axios, request }[http_client];
}

const visitor: Visitor<BaseState> = {
  ImportDeclaration(path, state) {
    if (path.node.specifiers.length !== 1) {
      return;
    }
    const firstSpecifier = path.node.specifiers[0];
    if (!u.isImportDefaultSpecifier(firstSpecifier)) {
      return;
    }

    const uri = path.node.source.value;
    const spec = loadOpenApiV2(uri, state);
    if (spec === null) {
      path.skip();
      return;
    }

    if (!u.isOpenAPIV2Document(spec)) {
      throw new Error('This API specification does not conform to OAS V2');
    }

    const { local } = firstSpecifier;
    if (local) {
      const { http_client } = state.escapin.config;
      u.traverse(newVisitor(http_client, local, spec), state);
      state.addDependency(http_client);
    }
    path.remove();
  },
};

function newVisitor(
  http_client: string,
  key: u.Identifier,
  spec: OpenAPIV2.Document,
): Visitor<BaseState> {
  const modifySnippets = _modifySnippets(http_client);
  return {
    MemberExpression(path, state): void {
      // GET
      if (!keyIncluded(path as u.NodePath, key)) {
        return;
      }

      modifySnippets(
        'get',
        key,
        spec,
        state,
        path as u.NodePath,
        path as u.NodePath,
      );
      path.skip();
    },
    CallExpression(path, state): void {
      // POST
      const callee = path.get('callee') as u.NodePath;
      const arg0 = path.node.arguments[0];
      if (
        !keyIncluded(callee, key) ||
        u.isArgumentPlaceholder(arg0) ||
        u.isJSXNamespacedName(arg0)
      ) {
        return;
      }

      modifySnippets(
        'post',
        key,
        spec,
        state,
        path as u.NodePath,
        callee,
        arg0,
      );
      path.skip();
    },
    AssignmentExpression(path, state): void {
      // PUT
      const left = path.get('left') as u.NodePath;
      const right = path.get('right').node;
      if (!keyIncluded(left, key)) {
        return;
      }
      modifySnippets('put', key, spec, state, path as u.NodePath, left, right);
      path.skip();
    },
    UnaryExpression(path, state): void {
      // DELETE
      const argument = path.get('argument') as u.NodePath;
      if (!keyIncluded(argument, key) || path.node.operator !== 'delete') {
        return;
      }
      modifySnippets('delete', key, spec, state, path as u.NodePath, argument);
      path.skip();
    },
  };
}

function keyIncluded(path: u.NodePath, key: u.Identifier): boolean {
  return u.test(
    path,
    path => path.isMemberExpression() && u.equals(path.node.object, key),
  );
}

export default visitor;
