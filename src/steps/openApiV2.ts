import { Visitor } from '@babel/traverse';
import { loopWhile } from 'deasync';
import fs from 'fs';
import { last } from 'lodash';
import { OpenAPIV2 } from 'openapi-types';
import Path from 'path';
import requestOrg from 'request';
import { dereference } from 'swagger-parser';
import { promisify } from 'util';
import { isURL } from 'validator';
import * as u from '../util';
import { SyntaxError } from '../error';
import { BaseState } from '../state';

const request = promisify(requestOrg);

export default function(baseState: BaseState) {
  console.log('openApiV2');
  u.traverse(visitor, new OpenApiV2State(baseState));
}

class OpenApiV2State extends BaseState {
  constructor(base?: BaseState) {
    super(base);
    this.apis = [];
  }

  public apis: Array<{ key: u.Identifier; spec: OpenAPIV2.Document }>;

  public key(path: u.NodePath): u.Identifier | undefined {
    const foundPath = u.find(path, path => {
      return (
        path.isMemberExpression() && this.apis.some(api => u.equals(path.node.object, api.key))
      );
    });
    return foundPath ? ((foundPath.node as u.MemberExpression).object as u.Identifier) : undefined;
  }
}

const visitor: Visitor<OpenApiV2State> = {
  ImportDeclaration(path, state) {
    if (path.node.specifiers.length !== 1) {
      return;
    }
    const firstSpecifier = path.node.specifiers[0];
    if (!u.isImportDefaultSpecifier(firstSpecifier)) {
      return;
    }
    const variable = firstSpecifier.local;

    let originalUri = path.node.source.value;
    let uri = originalUri;
    let resolved;
    let spec = null;
    let done = false;
    (async () => {
      try {
        if (isURL(uri)) {
          uri = Path.join(state.escapin.basePath, encodeURIComponent(uri));
          if (!fs.existsSync(uri)) {
            uri = originalUri;
            const response = await request({
              headers: {},
              method: 'GET',
              uri,
            });
            resolved = Path.join(state.escapin.basePath, encodeURIComponent(uri));
            fs.writeFileSync(resolved, response.body);
          } else {
            resolved = uri;
          }
        } else {
          resolved = state.resolvePath(uri);
          if (resolved === undefined) {
            throw new SyntaxError(`${originalUri} not found.`, path.node, state);
          } else if (!fs.existsSync(resolved)) {
            throw new SyntaxError(`${resolved} not found.`, path.node, state);
          }
        }
        spec = await dereference(resolved);
      } catch (err) {
        if (state.hasDependency(originalUri)) {
          console.log(`${originalUri} is a module.`);
        }
        const index = originalUri.lastIndexOf('/');
        const actualUri =
          index > 0 ? originalUri.substring(0, originalUri.lastIndexOf('/')) : originalUri;
        if (state.hasDependency(actualUri)) {
          console.log(`${actualUri} is a module.`);
        } else if (fs.existsSync(actualUri)) {
          console.log(`${actualUri} is a local module.`);
        } else {
          throw err;
        }
      } finally {
        done = true;
      }
    })();

    loopWhile(() => !done);

    if (spec != null) {
      if (!u.isOpenAPIV2Document(spec)) {
        throw new SyntaxError(
          'This API specification does not conform to OAS V2',
          path.node,
          state,
        );
      }
      if (variable) {
        state.apis.push({ key: variable, spec });
        state.addDependency('request', 'request');
      }
      path.remove();
      return;
    }
    path.skip();
  },
  MemberExpression(path, state) {
    // GET
    const key = state.key(path);
    if (key === undefined) {
      return;
    }

    const { options, actualTarget } = createRequestOptions('GET', key, path, state);

    if (actualTarget === undefined) {
      throw new Error('actualTarget is undefined');
    }

    modifySnippets('get', path, actualTarget, options);
    path.skip();
  },
  CallExpression(path, state) {
    // POST
    const callee = path.get('callee');
    const arg0 = path.node.arguments[0];
    const key = state.key(callee);
    if (key === undefined || u.isArgumentPlaceholder(arg0) || u.isJSXNamespacedName(arg0)) {
      return;
    }
    const { options, attrName } = createRequestOptions('POST', key, callee, state);

    if (attrName === undefined) {
      throw new Error('attrName is null.');
    }

    if (u.isSpreadElement(arg0)) {
      options.properties.unshift(arg0);
    } else {
      options.properties.unshift(u.objectProperty(u.stringLiteral(attrName), arg0));
    }

    modifySnippets('post', path, path, options);
    path.skip();
  },
  AssignmentExpression(path, state) {
    // PUT
    const left = path.get('left');
    const key = state.key(left);
    if (key === undefined) {
      return;
    }
    const { options, attrName } = createRequestOptions('PUT', key, left, state);

    if (attrName === undefined) {
      throw new Error('attrName is null.');
    }

    options.properties.unshift(
      u.objectProperty(
        u.stringLiteral(attrName),
        u.expression('JSON.stringify($BODY)', {
          $BODY: path.node.right,
        }),
      ),
    );

    modifySnippets('put', path, path, options);
    path.skip();
  },
  UnaryExpression(path, state) {
    // DELETE
    const argument = path.get('argument');
    const key = state.key(argument);
    if (key === undefined || path.node.operator !== 'delete') {
      return;
    }
    const { options } = createRequestOptions('DELETE', key, argument, state);

    const stmtPath = path.findParent(path => path.isStatement());
    stmtPath.replaceWith(
      u.statement('const { $RES, $BODY } = request($OPTIONS);', {
        $BODY: path.scope.generateUidIdentifier('body'),
        $OPTIONS: options,
        $RES: path.scope.generateUidIdentifier('res'),
      }),
    );
    path.skip();
  },
};

function isSecuritySchemeApiKey(
  security: OpenAPIV2.SecuritySchemeObject,
): security is OpenAPIV2.SecuritySchemeApiKey {
  return security.type === 'apiKey';
}

function isSecurityOAuth2(
  security: OpenAPIV2.SecuritySchemeObject,
): security is OpenAPIV2.SecuritySchemeOauth2 {
  return security.type === 'oauth2';
}

function isReferenceObject(
  param: OpenAPIV2.ReferenceObject | OpenAPIV2.Parameter,
): param is OpenAPIV2.ReferenceObject {
  return '$ref' in param;
}

function isBase64Encoded(str: string): boolean {
  return (
    str.match(/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{4}|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)$/) !==
    null
  );
}

function createURI(apiSpec: OpenAPIV2.Document, path: string): string {
  const scheme =
    apiSpec.schemes && Array.isArray(apiSpec.schemes) && apiSpec.schemes.includes('https')
      ? 'https'
      : 'http';
  return `${scheme}://${apiSpec.host}${apiSpec.basePath}${path}`;
}

function getContentType(
  apiSpec: OpenAPIV2.Document,
  pathSpec: OpenAPIV2.OperationObject | undefined,
) {
  if (pathSpec && pathSpec.consumes && pathSpec.consumes.length > 0) {
    return pathSpec.consumes[0];
  } else if (apiSpec.consumes && apiSpec.consumes.length > 0) {
    return apiSpec.consumes[0];
  }
  return 'application/json';
}

function getBodyParameterName(contentType: string): string {
  switch (contentType) {
    case 'multipart/form-data':
      return 'formData';
    case 'application/x-www-form-urlencoded':
      return 'form';
    case 'application/json':
    default:
      return 'body';
  }
}

function createRequestOptions(
  method: string,
  key: u.Identifier,
  nodePath: u.NodePath,
  state: OpenApiV2State,
): {
  options: u.ObjectExpression;
  attrName?: string;
  actualTarget?: u.NodePath;
} {
  const api = state.apis.find(_api => u.equals(key, _api.key));
  if (api === undefined) {
    throw new SyntaxError(`api ${key} not found.`, nodePath.node, state);
  }
  const apiSpec = api.spec;

  method = method.toLowerCase();

  // let node = path;
  let maxMatches = 0;
  let uri: string | undefined;
  let contentType: string | undefined;
  let attrName: string | undefined;
  let params: u.Node | undefined;
  let actualTarget: u.NodePath | undefined;
  let pathSpec: OpenAPIV2.OperationObject | undefined;
  const pathParamPattern = /^\{.*\}$/;

  for (const path in apiSpec.paths) {
    let newPath = path;
    let matches = 0;
    let tokens = path.split(/\/|\./).reverse();
    tokens.pop();
    const lastToken = last(tokens);
    if (lastToken && lastToken.match(pathParamPattern)) {
      tokens.push(lastToken.substring(1, lastToken.length - 1));
    }
    let failed = false;
    let iter = nodePath;
    let tempTarget: u.NodePath | undefined = undefined;
    TOKEN_LOOP: for (const token of tokens) {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { node } = iter;
        if (u.isMemberExpression(node)) {
          if (node.computed && token.match(pathParamPattern)) {
            if (u.isStringLiteral(node.property)) {
              newPath = newPath.replace(token, node.property.value);
            } else {
              newPath = newPath.replace(token, '${'.concat(u.generate(node.property)).concat('}'));
            }
            if (tempTarget === undefined) {
              tempTarget = iter;
            }
            matches += 1;
            iter = iter.get('object') as u.NodePath;
            break;
          } else if (!node.computed && token === node.property.name) {
            if (tempTarget === undefined) {
              tempTarget = iter;
            }
            matches += 1;
            iter = iter.get('object') as u.NodePath;
            break;
          } else if (iter === nodePath && node.computed) {
            params = node.property;
          }
          iter = iter.get('object') as u.NodePath;
          continue;
        }
        failed = true;
        break TOKEN_LOOP;
      }
    }
    if (!failed && !Array.isArray(iter) && u.equals(iter.node, key) && matches > maxMatches) {
      if (apiSpec.paths[path][method] === undefined) {
        continue;
      }
      pathSpec = apiSpec.paths[path][method];
      uri = createURI(apiSpec, newPath);
      contentType = getContentType(apiSpec, pathSpec);
      attrName = getBodyParameterName(contentType);
      actualTarget = tempTarget;
      maxMatches = matches;
    }
  }
  if (
    pathSpec === undefined ||
    uri === undefined ||
    attrName === undefined ||
    actualTarget === undefined
  ) {
    throw new SyntaxError(
      `This cannot be recognized as an API request: ${u.generate(nodePath.node)}`,
      nodePath.node,
      state,
    );
  }
  let headers = u.objectExpression([]);
  let qs = u.objectExpression([]);
  let options = u.objectExpression([
    u.objectProperty(u.stringLiteral('uri'), u.parseExpression(`\`${uri}\``)),
    u.objectProperty(u.stringLiteral('method'), u.stringLiteral(method)),
  ]);
  if (contentType) {
    options.properties.push(
      u.objectProperty(u.stringLiteral('contentType'), u.stringLiteral(contentType)),
    );
  }

  if (params) {
    actualTarget = nodePath;
    if (u.isObjectExpression(params) && params.properties.every(prop => u.isObjectProperty(prop))) {
      for (const property of params.properties) {
        if (!u.isObjectProperty(property)) {
          throw new SyntaxError('property is not an ObjectProperty.', nodePath.node, state);
        }
        if (pathSpec.parameters === undefined) {
          throw new SyntaxError('pathSpec.parameters is not an array.', nodePath.node, state);
        }
        const key = (property.key as u.Identifier).name;
        const param = pathSpec.parameters.find(
          param => !isReferenceObject(param) && param.name === key,
        );
        if (param && !isReferenceObject(param)) {
          switch (param.in) {
            case 'query':
              qs.properties.push(property);
              break;
            case 'header':
              headers.properties.push(property);
              break;
            case 'path':
            default:
              break;
          }
        }
      }
    } else {
      let paramsId;
      if (u.isIdentifier(params)) {
        paramsId = params;
      } else {
        paramsId = nodePath.scope.generateUidIdentifier('param');
        nodePath.insertBefore(
          u.statement('const $PARAM = $ORG;', {
            $ORG: params,
            $PARAM: paramsId,
          }),
        );
      }
      if (pathSpec.parameters) {
        for (const param of pathSpec.parameters) {
          if (isReferenceObject(param)) {
            continue;
          }
          const key = param.name;
          switch (param.in) {
            case 'query':
              qs.properties.push(
                u.objectProperty(
                  u.stringLiteral(key),
                  u.memberExpression(paramsId, u.identifier(key)),
                ),
              );
              break;
            case 'header':
              headers.properties.push(
                u.objectProperty(
                  u.stringLiteral(key),
                  u.memberExpression(paramsId, u.identifier(key)),
                ),
              );
              break;
            case 'path':
            default:
              break;
          }
        }
      }
    }
  }

  if (apiSpec.security && apiSpec.securityDefinitions) {
    for (const entry of apiSpec.security) {
      const key = Object.keys(entry)[0];
      if (state.escapin.config.credentials === undefined) {
        break;
      }
      const cred = state.escapin.config.credentials.find(that => that.api === apiSpec.info.title);
      if (cred === undefined) {
        break;
      }
      if (!(key in apiSpec.securityDefinitions)) {
        continue;
      }
      const value = cred[key];
      const security = apiSpec.securityDefinitions[key];
      if (security.type === 'basic') {
        const basicCred = `Basic ${
          isBase64Encoded(value) ? value : Buffer.from(value).toString('base64')
        }`;
        headers.properties.push(
          u.objectProperty(u.stringLiteral('authorization'), u.stringLiteral(basicCred)),
        );
      } else if (isSecuritySchemeApiKey(security)) {
        const apiKeyProp = u.objectProperty(u.stringLiteral(security.name), u.stringLiteral(value));
        if (security.in === 'header') {
          headers.properties.push(apiKeyProp);
        } else {
          qs.properties.push(apiKeyProp);
        }
      } else if (isSecurityOAuth2(security)) {
        // do nothing
      }
    }
  }
  if (attrName === 'body') {
    options.properties.push(u.objectProperty(u.stringLiteral('json'), u.booleanLiteral(true)));
  }
  if (headers.properties.length > 0) {
    options.properties.push(u.objectProperty(u.stringLiteral('headers'), headers));
  }
  if (qs.properties.length > 0) {
    options.properties.push(u.objectProperty(u.stringLiteral('qs'), qs));
  }
  return { options, attrName, actualTarget };
}

function modifySnippets(
  method: string,
  path: u.NodePath,
  target: u.NodePath,
  options: u.ObjectExpression,
) {
  const variable = path.scope.generateUidIdentifier(method);

  const letSnippet = u.statements('const { $RES, $BODY } = request($OPTIONS); let $VAR = $BODY', {
    $BODY: path.scope.generateUidIdentifier('body'),
    $OPTIONS: options,
    $RES: path.scope.generateUidIdentifier('res'),
    $VAR: variable,
  });

  const assignmentSnippet = u.statements(
    'const { $RES, $BODY } = request($OPTIONS); $VAR = $BODY',
    {
      $BODY: path.scope.generateUidIdentifier('body'),
      $OPTIONS: options,
      $RES: path.scope.generateUidIdentifier('res'),
      $VAR: variable,
    },
  );

  const stmtPath = path.findParent(path => path.isStatement());
  if (stmtPath.isExpressionStatement() && u.equals(stmtPath.node.expression, target.node)) {
    stmtPath.replaceWith(letSnippet[0]);
  } else if (stmtPath.isWhileStatement()) {
    stmtPath.insertBefore(letSnippet);
    const block = stmtPath.node.body as u.BlockStatement;
    block.body = [...block.body, ...assignmentSnippet];
  } else if (stmtPath.isDoWhileStatement()) {
    stmtPath.insertBefore(u.statement('let $VAR;', { $VAR: variable }));
    const block = stmtPath.node.body as u.BlockStatement;
    block.body = [...block.body, ...assignmentSnippet];
  } else {
    stmtPath.insertBefore(letSnippet);
  }
  u.replace(stmtPath, target.node, variable);
}
