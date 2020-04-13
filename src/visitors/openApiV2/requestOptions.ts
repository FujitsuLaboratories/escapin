import { OpenAPIV2 } from 'openapi-types';
import { EscapinSyntaxError } from '../../error';
import { BaseState } from '../../state';
import * as u from '../../util';
import identifyRootNode from './rootNode';

export default function(
  method: string,
  key: u.Identifier,
  spec: OpenAPIV2.Document,
  nodePath: u.NodePath,
  state: BaseState,
): {
  options: u.ObjectExpression;
  bodyParameter: string;
  target: u.NodePath;
} {
  try {
    method = method.toLowerCase();

    const { uri, contentType, bodyParameter, params, rootPath, operation } = identifyRootNode(
      spec,
      nodePath,
      method,
      key,
    );

    const target = params !== undefined ? nodePath : rootPath;

    const options = u.objectExpression([
      u.objectProperty(u.identifier('uri'), u.parseExpression(`\`${uri}\``)),
      u.objectProperty(u.identifier('method'), u.stringLiteral(method)),
    ]);
    if (contentType) {
      options.properties.push(
        u.objectProperty(u.identifier('contentType'), u.stringLiteral(contentType)),
      );
    }

    const headers = u.objectExpression([]);
    const qs = u.objectExpression([]);

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
        if (operation.parameters) {
          for (const param of operation.parameters) {
            if (isReferenceObject(param)) {
              continue;
            }
            const key = param.name;
            switch (param.in) {
              case 'query':
                qs.properties.push(
                  u.objectProperty(
                    u.identifier(key),
                    u.memberExpression(paramsId, u.identifier(key)),
                  ),
                );
                break;
              case 'header':
                headers.properties.push(
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
        const cred = state.escapin.config.credentials.find(that => that.api === spec.info.title);
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
            isBase64Encoded(value) ? value : Buffer.from(value).toString('base64')
          }`;
          headers.properties.push(
            u.objectProperty(u.identifier('authorization'), u.stringLiteral(basicCred)),
          );
        } else if (isSecuritySchemeApiKey(security)) {
          const apiKeyProp = u.objectProperty(u.identifier(security.name), u.stringLiteral(value));
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
    if (bodyParameter === 'body') {
      options.properties.push(u.objectProperty(u.identifier('json'), u.booleanLiteral(true)));
    }
    if (headers.properties.length > 0) {
      options.properties.push(u.objectProperty(u.identifier('headers'), headers));
    }
    if (qs.properties.length > 0) {
      options.properties.push(u.objectProperty(u.identifier('qs'), qs));
    }
    return { options, bodyParameter, target };
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
    str.match(/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{4}|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)$/) !==
    null
  );
}
