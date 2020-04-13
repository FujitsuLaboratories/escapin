import request from 'request';

const { _res, _body } = request({
  uri: `https://petstore.swagger.io/v2/pet/${id}`,
  method: 'get',
  contentType: 'application/json',
  json: true,
});
let _get = _body;
const newPet = _get;
const { _res3, _body3 } = request({
  uri: 'https://petstore.swagger.io/v2/pet/1234',
  method: 'get',
  contentType: 'application/json',
  json: true,
});
const { _res5, _body5 } = request({
  uri: 'https://petstore.swagger.io/v2/pet/abcd',
  method: 'get',
  contentType: 'application/json',
  json: true,
});
const { _res7, _body7 } = request({
  uri: `https://petstore.swagger.io/v2/pet/${id}`,
  method: 'get',
  contentType: 'application/json',
  json: true,
});
let _get4 = _body7;
_get4.name;
const { _res9, _body9 } = request({
  body: JSON.stringify(newPet),
  uri: 'https://petstore.swagger.io/v2/pet',
  method: 'put',
  contentType: 'application/json',
  json: true,
});
const { _res13, _body13 } = request({
  uri: `https://petstore.swagger.io/v2/pet/${id}`,
  method: 'get',
  contentType: 'application/json',
  json: true,
});
let _get5 = _body13;
const { _res11, _body11 } = request({
  body: JSON.stringify(_get5),
  uri: 'https://petstore.swagger.io/v2/pet',
  method: 'put',
  contentType: 'application/json',
  json: true,
});
const { _res15, _body15 } = request({
  body: newPet,
  uri: 'https://petstore.swagger.io/v2/pet',
  method: 'post',
  contentType: 'application/json',
  json: true,
});
const { _res17, _body17 } = request({
  formData: image,
  uri: `https://petstore.swagger.io/v2/pet/${id}/uploadImage`,
  method: 'post',
  contentType: 'multipart/form-data',
});
const { _res19, _body19 } = request({
  uri: `https://petstore.swagger.io/v2/pet/${id}`,
  method: 'delete',
  contentType: 'application/json',
  json: true,
});
const { _res20, _body20 } = request({
  uri: 'https://petstore.swagger.io/v2/pet/findByStatus',
  method: 'get',
  contentType: 'application/json',
  json: true,
  qs: {
    status: 'available',
  },
});
let _get6 = _body20;
const pets = _get6;
const { _res22, _body22 } = request({
  body: {
    id: 0,
    petId: 0,
    quantity: 0,
    shipDate: '2017-10-03T06:03:36.447Z',
    status: 'placed',
    complete: false,
  },
  uri: 'https://petstore.swagger.io/v2/store/order',
  method: 'post',
  contentType: 'application/json',
  json: true,
});
let _post3 = _body22;
const orderId = _post3;
