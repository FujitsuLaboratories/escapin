import test from 'ava';
import { v4 as uuid } from 'uuid';
import * as c from '../../src/util';
import step from '../../src/steps/refineObject';
import { BaseState } from '../../src/state';
import { Escapin } from '../../src';

test('test object', t => {
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

  const id = uuid();

  const after = `
const _store = {
  foo,
  bar
};

const _temp = new DynamoDB().putItem({
  TableName: "store-${id}",
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
  TableName: "store-${id}",
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
  TableName: "store-${id}",
  Key: {
    key: {
      S: id3
    }
  }
});

const _temp5 = new DynamoDB().scan({
  TableName: "store-${id}",
  ExpressionAttributeNames: {
    '#ky': 'key'
  },
  ProjectionExpression: '#ky'
});

const _store3 = _temp5.Items.map(item => item.key.S);

for (const key of _store3) {
  const _temp6 = new DynamoDB().getItem({
    TableName: "store-${id}",
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

  const astBefore = c.parse(before);

  const state = new BaseState();
  state.filename = 'test';
  state.code = before;
  state.ast = astBefore;
  state.replacements = [];
  state.escapin = new Escapin('test');
  state.escapin.id = id;
  state.escapin.config = {
    name: 'test',
    platform: 'aws',
    output_dir: 'test',
  };
  state.escapin.serverlessConfig = {
    service: state.escapin.config.name,
    provider: {
      name: state.escapin.config.platform,
      runtime: 'nodejs10.x',
      stage: 'dev',
      apiKeys: {},
    },
    functions: {},
    resources: {},
  };

  step(state);

  const astAfter = c.parse(after);

  t.deepEqual(c.purify(astBefore), c.purify(astAfter));
});
