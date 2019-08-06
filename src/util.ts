import generator from '@babel/generator';
import * as parser from '@babel/parser';
import template from '@babel/template';
import _traverse, { NodePath, Visitor } from '@babel/traverse';
import * as t from '@babel/types';
import fs from 'fs';
import { isEqual, last, remove as _remove } from 'lodash';
import { OpenAPIV2 } from 'openapi-types';
import Path from 'path';
import vm from 'vm';
import { BaseState } from './state';

export * from '@babel/types';
export { NodePath } from '@babel/traverse';

export const ERROR_PATTERN = /(^e$|^e(r|x)+.*)/;
const PLACEHOLDER_PATTERN = /^\$[_$A-Z0-9]+$/;

export type OneOrMore<T> = T | T[];

export function isOpenAPIV2Document(data: any): data is OpenAPIV2.Document {
  return typeof data.swagger === 'string' && data.swagger.startsWith('2');
}

export function isNode(node: any): node is t.Node {
  return 'type' in node;
}

export function traverse(visitor: Visitor, state: BaseState) {
  _traverse(state.ast, {
    Program(path) {
      path.traverse(visitor, state);
      path.skip();
    },
  });
}

export function parse(code: string): t.File {
  return parser.parse(code, {
    allowReturnOutsideFunction: true,
    plugins: ['jsx', 'typescript'],
    sourceType: 'module',
  });
}

export function parseExpression(code: string): t.Expression {
  return parser.parseExpression(code, {
    allowReturnOutsideFunction: true,
    plugins: ['jsx', 'typescript'],
    sourceType: 'module',
  });
}

export function generate(ast: t.Node): string {
  return generator(ast).code;
}

export function statements(tpl: string, vars: { [x: string]: OneOrMore<t.Node> }): t.Statement[] {
  return template.statements(tpl, {
    placeholderPattern: PLACEHOLDER_PATTERN,
  })(vars);
}

export function statement(tpl: string, vars: { [x: string]: OneOrMore<t.Node> }): t.Statement {
  return template.statement(tpl, {
    placeholderPattern: PLACEHOLDER_PATTERN,
  })(vars);
}

export function expression(tpl: string, vars: { [x: string]: OneOrMore<t.Node> }): t.Expression {
  return template.expression(tpl, {
    placeholderPattern: PLACEHOLDER_PATTERN,
  })(vars);
}

export function snippetFor(
  specifier: string,
  vars?: { [x: string]: OneOrMore<t.Node> },
): t.Statement[] {
  const tpl = fs.readFileSync(
    // eslint-disable-next-line no-undef
    Path.resolve(__dirname, `../templates/${specifier.replace(/\./g, '/')}.js`),
    'utf8',
  );
  if (vars === undefined) {
    return parse(tpl).program.body;
  }
  return template.statements(tpl, {
    placeholderPattern: PLACEHOLDER_PATTERN,
  })(vars);
}

export function purify(node: t.Node): t.Node {
  const _node = t.cloneDeep(node);
  [
    'start',
    'end',
    'loc',
    'extra',
    'decorators',
    'leadingComments',
    'innerComments',
    'trailingComments',
    'comments',
    'typeAnnotation',
    'typeArguments',
    'optional',
  ].forEach(key => delete _node[key]);
  ['async', 'generator'].forEach(key => {
    if (!_node[key]) {
      delete _node[key];
    }
  });
  for (const key in _node) {
    if (_node[key] === null) {
      continue;
    }
    if (typeof _node[key] === 'object' && 'type' in _node[key]) {
      _node[key] = purify(_node[key]);
    } else if (Array.isArray(_node[key])) {
      for (let i = 0; i < _node[key].length; i++) {
        _node[key][i] = purify(_node[key][i]);
      }
    }
  }
  return _node;
}

export function equals(lhs: any, rhs: any) {
  if (lhs === undefined || rhs === undefined) {
    return false;
  }
  if (isNode(lhs) && isNode(rhs)) {
    return isEqual(purify(lhs), purify(rhs));
  }
  return isEqual(lhs, rhs);
}

export function remove<T>(array: T[], item: T) {
  _remove(array, that => equals(that, item));
}

export function objectToNode(object: object): t.Node {
  const ast = parse(`var dummy = ${JSON.stringify(object)};`);
  _traverse(ast, {
    StringLiteral(path) {
      const str = path.node.value;
      if (str.indexOf('${') === -1) {
        return;
      }
      let substr;
      let index = 0;
      let lastIndex = 0;
      const expressions = [];
      const quasis = [];
      index = str.indexOf('${', lastIndex);
      while (index !== -1) {
        substr = str.substring(lastIndex, index);
        quasis.push(t.templateElement({ raw: substr, cooked: substr }, false));
        lastIndex = index + 2;
        index = str.indexOf('}', lastIndex);
        substr = str.substring(lastIndex, index);
        expressions.push(t.identifier(substr));
        lastIndex = index + 1;
        index = str.indexOf('${', lastIndex);
      }
      substr = str.substring(lastIndex);
      quasis.push(t.templateElement({ raw: substr, cooked: substr }, true));
      path.replaceWith(t.templateLiteral(quasis, expressions));
    },
  });
  const decl = ast.program.body[0];
  if (!t.isVariableDeclaration(decl)) {
    throw new Error('ast.program.body[0] is not a VariableDeclaration');
  }
  if (decl.declarations[0].init === null) {
    throw new Error('decl.declarations[0].init is null');
  }
  return decl.declarations[0].init;
}

export function find(
  path: NodePath,
  positive: (x: NodePath) => boolean,
  negative?: (x: NodePath) => boolean,
): NodePath | undefined {
  let ret;
  if (positive(path)) {
    ret = path;
  } else if (!(negative && negative(path))) {
    path.traverse({
      enter(path) {
        if (positive(path)) {
          ret = path;
          path.stop();
        } else if (negative && negative(path)) {
          path.skip();
        }
      },
    });
  }
  return ret;
}

export function findAll(
  path: NodePath,
  positive: (x: NodePath) => boolean,
  negative?: (x: NodePath) => boolean,
): NodePath[] {
  let ret = [];
  if (positive(path)) {
    ret.push(path);
  } else if (!(negative && negative(path))) {
    path.traverse({
      enter(path) {
        if (positive(path)) {
          ret.push(path);
        } else if (negative && negative(path)) {
          path.skip();
        }
      },
    });
  }
  return ret;
}

export function test(
  path: NodePath,
  positive: (x: NodePath) => boolean,
  negative?: (x: NodePath) => boolean,
): boolean {
  return undefined !== find(path, positive, negative);
}

export function equalsEither(path: NodePath, target: OneOrMore<t.Node>): boolean {
  return Array.isArray(target)
    ? target.some(that => equals(path.node, that))
    : equals(path.node, target);
}

export function includes(path: NodePath, target: OneOrMore<t.Node>): boolean {
  return test(path, path => equalsEither(path, target));
}

export function replace(
  path: NodePath,
  target: OneOrMore<t.Node>,
  replacement: t.Node,
  ignoreIf?: (x: NodePath) => boolean,
): void {
  path.traverse({
    enter(path) {
      if (ignoreIf && ignoreIf(path)) {
        path.skip();
      } else if (equalsEither(path, target)) {
        path.replaceWith(replacement);
        path.skip();
      }
    },
  });
}

export function hasCallback(node: t.CallExpression): boolean {
  return node.arguments.length > 0 && t.isFunction(last(node.arguments));
}

export function isSimpleAwaitStatement(node: t.Node): boolean {
  return t.isExpressionStatement(node) && t.isAwaitExpression(node.expression);
}

export function isNewPromise(node: t.Node): boolean {
  return t.isNewExpression(node) && t.isIdentifier(node.callee, { name: 'Promise' });
}

export function getFunctionId(path: NodePath, func: t.Function): t.Identifier | undefined {
  const { node } = path;
  if (
    t.isExpressionStatement(node) &&
    t.isAssignmentExpression(node.expression) &&
    t.isIdentifier(node.expression.left) &&
    func === node.expression.right
  ) {
    return node.expression.left;
  } else if (t.isVariableDeclaration(node)) {
    const { id, init } = node.declarations[0];
    if (t.isIdentifier(id) && func === init) {
      return id;
    }
  } else if (t.isFunctionDeclaration(node) && t.isIdentifier(node.id)) {
    return node.id;
  }
  return undefined;
}

export function isErrorParam(node: t.Node): node is t.Identifier {
  return t.isIdentifier(node) && node.name.match(ERROR_PATTERN) !== null;
}

export function toStatements(node: t.Statement): t.Statement[] {
  if (t.isBlockStatement(node)) {
    return node.body;
  }
  return [node];
}

export function evalSnippet(snippet: t.Node, variables: { [x: string]: any } = {}): string {
  const script = new vm.Script(generate(snippet));
  const context = vm.createContext(variables);
  return script.runInContext(context);
}

export function reuseReplacement(path: NodePath, state: BaseState, right: t.MemberExpression) {
  if (!Array.isArray(path.container)) {
    return undefined;
  }
  const indexOfPropertyChange = path.container.findIndex(
    stmt =>
      t.isExpressionStatement(stmt) &&
      t.isAssignmentExpression(stmt.expression) &&
      equals(stmt.expression.left, right.property),
  );
  let nearestIndex = 0;
  let reused;
  for (const that of state.replacements) {
    if (path.scope === that.scope && equals(right, that.original)) {
      const index = path.container.findIndex(
        stmt => t.isVariableDeclaration(stmt) && equals(stmt.declarations[0].id, that.replaced),
      );
      if (indexOfPropertyChange < index && nearestIndex < index && index < path.key) {
        nearestIndex = index;
        reused = that;
      }
    }
  }
  return reused;
}

export function getTypeName(node: t.TSEntityName): string {
  if (t.isTSQualifiedName(node)) {
    return `${getTypeName(node.left)}.${node.right.name}`;
  }
  return node.name;
}
