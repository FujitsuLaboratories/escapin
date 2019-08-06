import test from 'ava';
import step from '../../src/steps/refineObject';
import { compare } from '../util';

test('test object', async t => {
  const before = `
export const store: aws.dynamodb = {};
store[id] = {
  foo, bar
};
const foo = store[id2];
delete store[id3];
for (const key of Object.keys(store)) {
  const bar = store[key];
}
`;

  const after = `
const _store = {
  foo,
  bar
};

const _temp = new DynamoDB().putItem({
  TableName: "store-test",
  Item: {
    key: {
      S: id
    },
    type: {
      S: typeof _store
    },
    value: {
      S: typeof _store === 'object' || typeof _store === 'function' ? JSON.stringify(_store) : _store
    }
  }
});

const _temp2 = new DynamoDB().getItem({
  TableName: "store-test",
  Key: {
    key: {
      S: id2
    }
  }
});

let _store2;

if (_temp2 === null || _temp2.Item === undefined) {
  _store2 = undefined;
} else {
  _store2 = _temp2.Item.type.S === 'object' || _temp2.Item.type.S === 'function' ? JSON.parse(_temp2.Item.value.S) : _temp2.Item.value.S;
}

const foo = _store2[id2];

const _temp4 = new DynamoDB().deleteItem({
  TableName: "store-test",
  Key: {
    key: {
      S: id3
    }
  }
});

const _temp5 = new DynamoDB().scan({
  TableName: "store-test",
  ExpressionAttributeNames: {
    '#ky': 'key'
  },
  ProjectionExpression: '#ky'
});

const _store3 = _temp5.Items.map(item => item.key.S);

for (const key of _store3) {
  const _temp6 = new DynamoDB().getItem({
    TableName: "store-test",
    Key: {
      key: {
        S: key
      }
    }
  });

  let _store4;

  if (_temp6 === null || _temp6.Item === undefined) {
    _store4 = undefined;
  } else {
    _store4 = _temp6.Item.type.S === 'object' || _temp6.Item.type.S === 'function' ? JSON.parse(_temp6.Item.value.S) : _temp6.Item.value.S;
  }

  const bar = _store4[key];
}
  `;

  await compare(t, before, after, step);
});
