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
const pets = petstore.pet.findByStatus[{ status: 'available' }];
const orderId = petstore.store.order({
  id: 0,
  petId: 0,
  quantity: 0,
  shipDate: '2017-10-03T06:03:36.447Z',
  status: 'placed',
  complete: false,
});
