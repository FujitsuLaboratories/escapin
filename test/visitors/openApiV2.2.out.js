import axios from 'axios';

const _res = axios.get(`https://petstore.swagger.io/v2/pet/${id}`, {
  headers: {},
  params: {},
});

let _get = _res.data;
const newPet = _get;
axios.get('https://petstore.swagger.io/v2/pet/1234', {
  headers: {},
  params: {},
});
axios.get('https://petstore.swagger.io/v2/pet/abcd', {
  headers: {},
  params: {},
});

const _res4 = axios.get(`https://petstore.swagger.io/v2/pet/${id}`, {
  headers: {},
  params: {},
});

let _get4 = _res4.data;
_get4.name;
axios.put('https://petstore.swagger.io/v2/pet', newPet, {
  headers: {},
  params: {},
});

const _res7 = axios.get(`https://petstore.swagger.io/v2/pet/${id}`, {
  headers: {},
  params: {},
});

let _get5 = _res7.data;
axios.put('https://petstore.swagger.io/v2/pet', _get5, {
  headers: {},
  params: {},
});
axios.post('https://petstore.swagger.io/v2/pet', newPet, {
  headers: {},
  params: {},
});
petstore.pet[id].uploadImage(image);

const _res10 = axios.delete(`https://petstore.swagger.io/v2/pet/${id}`, {
  headers: {},
  params: {},
});

const _res11 = axios.get('https://petstore.swagger.io/v2/pet/findByStatus', {
  headers: {},
  params: {
    status: 'available',
  },
});

let _get6 = _res11.data;
const pets = _get6;

const _res12 = axios.post(
  'https://petstore.swagger.io/v2/store/order',
  {
    id: 0,
    petId: 0,
    quantity: 0,
    shipDate: '2017-10-03T06:03:36.447Z',
    status: 'placed',
    complete: false,
  },
  {
    headers: {},
    params: {},
  },
);

let _post3 = _res12.data;
const orderId = _post3;
