import { last } from 'lodash';
import { OpenAPIV2 } from 'openapi-types';
import { HttpMethod } from '../../types';
import * as u from '../../util';

export function identifyRootNode(
  spec: OpenAPIV2.Document,
  nodePath: u.NodePath,
  method: HttpMethod,
  key: u.Identifier,
): {
  uri: string;
  contentType: string;
  params?: u.ObjectExpression;
  rootNodePath: u.NodePath;
  operation: OpenAPIV2.OperationObject;
} {
  let maxMatches = 0;
  let uri!: string;
  let contentType!: string;
  let params!: u.ObjectExpression;
  let rootNodePath!: u.NodePath;
  let operation!: OpenAPIV2.OperationObject;
  const pathParamPattern = /^\{.*\}$/;

  for (const path in spec.paths) {
    if (spec.paths[path][method] === undefined) {
      continue;
    }
    const tokens = path.split(/\/|\./).reverse();
    tokens.pop();
    const lastToken = last(tokens);
    if (lastToken?.match(pathParamPattern)) {
      tokens.push(lastToken.substring(1, lastToken.length - 1));
    }
    let newPath = path;
    let matches = 0;
    let rootCandidate!: u.NodePath;
    let iter = nodePath;
    let failed = false;
    for (const token of tokens) {
      while (u.isMemberExpression(iter.node)) {
        const { node } = iter;
        const { computed, property } = node;
        if (computed && u.isObjectExpression(property)) {
          params = property;
        } else if (computed && token.match(pathParamPattern)) {
          newPath = newPath.replace(
            token,
            u.isStringLiteral(property)
              ? property.value
              : `$\{${u.generate(property)}}`,
          );
          break;
        } else if (
          !computed &&
          u.isIdentifier(property) &&
          token === property.name
        ) {
          break;
        }
        iter = iter.get('object') as u.NodePath;
      }
      if (!u.isMemberExpression(iter.node)) {
        failed = true;
        break;
      }
      rootCandidate = rootCandidate || iter;
      matches += 1;
      iter = iter.get('object') as u.NodePath;
    }
    if (!failed && u.equals(iter.node, key) && matches > maxMatches) {
      operation = spec.paths[path][method];
      uri = createURI(spec, newPath);
      contentType = getContentType(spec, operation);
      rootNodePath = rootCandidate;
      maxMatches = matches;
    }
  }
  if (maxMatches === 0) {
    throw new Error('This cannot be recognized as an API request');
  }

  return {
    uri,
    contentType,
    params,
    rootNodePath,
    operation,
  };
}

function createURI(spec: OpenAPIV2.Document, path: string): string {
  const scheme =
    spec.schemes &&
    Array.isArray(spec.schemes) &&
    spec.schemes.includes('https')
      ? 'https'
      : 'http';
  return `${scheme}://${spec.host}${spec.basePath}${path}`;
}

function getContentType(
  spec: OpenAPIV2.Document,
  operation: OpenAPIV2.OperationObject | undefined,
): string {
  if (operation && operation.consumes && operation.consumes.length > 0) {
    return operation.consumes[0];
  } else if (spec.consumes && spec.consumes.length > 0) {
    return spec.consumes[0];
  }
  return 'application/json';
}
