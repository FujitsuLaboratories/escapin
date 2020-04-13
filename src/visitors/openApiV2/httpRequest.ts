import { OpenAPIV2 } from 'openapi-types';
import { EscapinSyntaxError } from '../../error';
import { BaseState } from '../../state';
import * as u from '../../util';
import { HttpMethod, HttpRequest } from '../../types';
import { identifyRootNode } from './rootNode';

export function createOptions(
  method: HttpMethod,
  key: u.Identifier,
  spec: OpenAPIV2.Document,
  nodePath: u.NodePath,
  target: u.NodePath,
  state: BaseState,
): HttpRequest {
  try {
    const {
      uri,
      contentType,
      params,
      rootNodePath,
      operation,
    } = identifyRootNode(spec, target, method, key);

    const targetNodePath =
      method !== 'get' || params !== undefined ? nodePath : rootNodePath;

    const header = u.objectExpression([]);
    const query = u.objectExpression([]);

    if (params) {
      if (
        u.isObjectExpression(params) &&
        params.properties.every(prop => u.isObjectProperty(prop))
      ) {
        for (const property of params.properties) {
          if (!u.isObjectProperty(property)) {
            throw new Error('property is not an ObjectProperty.');
          }
          if (operation.parameters === undefined) {
            throw new Error('operation.parameters is not an array.');
          }
          const key = (property.key as u.Identifier).name;
          const param = operation.parameters.find(
            param => !isReferenceObject(param) && param.name === key,
          );
          if (param && !isReferenceObject(param)) {
            switch (param.in) {
              case 'query':
                query.properties.push(property);
                break;
              case 'header':
                header.properties.push(property);
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
        if (operation.parameters) {
          for (const param of operation.parameters) {
            if (isReferenceObject(param)) {
              continue;
            }
            const key = param.name;
            switch (param.in) {
              case 'query':
                query.properties.push(
                  u.objectProperty(
                    u.identifier(key),
                    u.memberExpression(paramsId, u.identifier(key)),
                  ),
                );
                break;
              case 'header':
                header.properties.push(
                  u.objectProperty(
                    u.identifier(key),
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

    if (spec.security && spec.securityDefinitions) {
      for (const entry of spec.security) {
        const key = Object.keys(entry)[0];
        if (state.escapin.config.credentials === undefined) {
          break;
        }
        const cred = state.escapin.config.credentials.find(
          that => that.api === spec.info.title,
        );
        if (cred === undefined) {
          break;
        }
        if (!(key in spec.securityDefinitions)) {
          continue;
        }
        const value = cred[key];
        const security = spec.securityDefinitions[key];
        if (security.type === 'basic') {
          const basicCred = `Basic ${
            isBase64Encoded(value)
              ? value
              : Buffer.from(value).toString('base64')
          }`;
          header.properties.push(
            u.objectProperty(
              u.identifier('authorization'),
              u.stringLiteral(basicCred),
            ),
          );
        } else if (isSecuritySchemeApiKey(security)) {
          const apiKeyProp = u.objectProperty(
            u.identifier(security.name),
            u.stringLiteral(value),
          );
          if (security.in === 'header') {
            header.properties.push(apiKeyProp);
          } else {
            query.properties.push(apiKeyProp);
          }
        } else if (isSecurityOAuth2(security)) {
          // do nothing
        }
      }
    }
    return { targetNodePath, uri, contentType, header, query };
  } catch (err) {
    throw new EscapinSyntaxError(err, nodePath.node, state);
  }
}

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
    str.match(
      /^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{4}|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)$/,
    ) !== null
  );
}
