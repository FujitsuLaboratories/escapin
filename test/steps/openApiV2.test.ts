import test from 'ava';
import * as c from '../../src/util';
import step from '../../src/steps/openApiV2';
import { BaseState } from '../../src/state';
import { Escapin } from '../../src';

test('test openApiV2', t => {
  const before = `
import petstore from 'https://petstore.swagger.io/v2/swagger.json';

const pet = petstore.pet[id];
petstore.pet[1234];
petstore.pet['abcd'];
petstore.pet[id].name;
petstore.pet = newPet;
petstore.pet = petstore.pet[id];
petstore.pet(newPet);
petstore.pet[id].uploadImage(image);
delete petstore.pet[id];
  `;

  const after = `
const {
  _res,
  _body
} = request({
  "uri": \`https://petstore.swagger.io/v2/pet/$\{id}\`,
  "method": "get",
  "contentType": "application/json",
  "json": true
});
let _get = _body;
const pet = _get;
const _param = 1234;
const {
  _res3,
  _body3
} = request({
  "uri": \`https://petstore.swagger.io/v2/pet/$\{1234}\`,
  "method": "get",
  "contentType": "application/json",
  "json": true
});
const _param2 = 'abcd';
const {
  _res5,
  _body5
} = request({
  "uri": \`https://petstore.swagger.io/v2/pet/abcd\`,
  "method": "get",
  "contentType": "application/json",
  "json": true
});
const {
  _res7,
  _body7
} = request({
  "uri": \`https://petstore.swagger.io/v2/pet/$\{id}\`,
  "method": "get",
  "contentType": "application/json",
  "json": true
});
let _get4 = _body7;
_get4.name;
const {
  _res9,
  _body9
} = request({
  "body": JSON.stringify(newPet),
  "uri": \`https://petstore.swagger.io/v2/pet\`,
  "method": "put",
  "contentType": "application/json",
  "json": true
});
const {
  _res13,
  _body13
} = request({
  "uri": \`https://petstore.swagger.io/v2/pet/$\{id}\`,
  "method": "get",
  "contentType": "application/json",
  "json": true
});
let _get5 = _body13;
const {
  _res11,
  _body11
} = request({
  "body": JSON.stringify(_get5),
  "uri": \`https://petstore.swagger.io/v2/pet\`,
  "method": "put",
  "contentType": "application/json",
  "json": true
});
const {
  _res15,
  _body15
} = request({
  "body": newPet,
  "uri": \`https://petstore.swagger.io/v2/pet\`,
  "method": "post",
  "contentType": "application/json",
  "json": true
});
const {
  _res17,
  _body17
} = request({
  "formData": image,
  "uri": \`https://petstore.swagger.io/v2/pet/$\{id}/uploadImage\`,
  "method": "post",
  "contentType": "multipart/form-data"
});
const {
  _res19,
  _body19
} = request({
  "uri": \`https://petstore.swagger.io/v2/pet/$\{id}\`,
  "method": "delete",
  "contentType": "application/json",
  "json": true,
  "headers": {
    "api_key": id.api_key
  }
});
  `;

  const astBefore = c.parse(before);

  const state = new BaseState();
  state.filename = 'dummy';
  state.code = before;
  state.ast = astBefore;
  state.escapin = new Escapin('dummy');
  state.escapin.basePath = process.cwd();
  state.escapin.config = {
    name: 'test',
    platform: 'aws',
    output_dir: __dirname,
  }

  step(state);

  const astAfter = c.parse(after);

  t.deepEqual(c.purify(astBefore), c.purify(astAfter));
});
