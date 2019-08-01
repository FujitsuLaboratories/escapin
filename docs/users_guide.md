## Documentation

### Table of Contents

1. [AWS リソースのソースコード中での利用](#aws-resources)
   - [DynamoDB, S3](#dynamodb-s3)
   - [Lambda](#lambda)
2. [API のインポート](#import-api)
3. [API のエクスポート](#export-api)
4. [非同期処理の同期的記述](#async)
5. [非同期的記述の許容](#compatibility)

### Escapin が提供する JavaScript の意味規則およびコンパイル例

#### <a name="aws-resources"></a> 1. AWS リソースのソースコード中での利用

Escapin は，DynamoDB Table や S3 Bucket，Lambda Function 等の AWS のリソースの操作を JavaScript 上での単純なオブジェクト変数や関数の操作にマップすることで，よりビジネスロジックの実装に集中できるようなプログラミング体験を提供します．

Escapin は[Serverless Framework](https://github.com/serverless/serverless)と連携させるために，コンパイルの過程で AWS リソースの作成・管理のための定義ファイル `serverless.yml` を生成・編集します．

##### <a name="dynamodb-s3"></a> DynamoDB, S3

```javascript
export const foo: dynamodb = {};
export const bar: s3 = {};
```

上記のようなエクスポートされた空のオブジェクト変数が宣言されている場合，型アノテーションで指定された通りに

- foo: DynamoDB Table
- bar: S3 Bucket

を作成するような `serverless.yml` の設定を自動生成します．

この変数に対する操作

```javascript
foo[id] = bar;

baz = foo[id];

qux = Object.keys(foo);

delete foo[id];
```

は以下のような同期的記述にコンパイルされます．
DynamoDB の TableName，S3 の BucketName には，変数名の後にランダム UUID が自動で追加されます．

```javascript
import { DynamoDB } from "aws-sdk";

// foo[id] = bar;
new DynamoDB().putItem({
  TableName: "foo-9fe932f9-32e7-49f7-a341-0dca29a8bb32",
  Item: {
    key: { S: id },
    type: { S: typeof bar },
    value: {
      S:
        typeof bar === "object" || typeof bar === "function"
          ? JSON.stringify(bar)
          : bar
    }
  }
});

// baz = foo[id];
const temp = new DynamoDB().getItem({
  TableName: "foo-9fe932f9-32e7-49f7-a341-0dca29a8bb32",
  Item: {
    key: { S: id }
  }
});
baz =
  temp === null || temp.Item === undefined
    ? undefined
    : _temp.Item.type.S === "object" || temp.Item.type.S === "function"
    ? JSON.parse(temp.Item.value.S)
    : temp.Item.value.S;

// qux = Object.keys(foo);
qux = new DynamoDB().scan({
  TableName: "csv-9fe932f9-32e7-49f7-a341-0dca29a8bb32",
  ExpressionAttributeNames: { "#ky": "key" },
  ProjectionExpression: "#ky"
});

// delete foo[id];
new DynamoDB().deleteItem({
  TableName: "csv-9fe932f9-32e7-49f7-a341-0dca29a8bb32",
  Key: { key: { S: id } }
});
```

##### <a name="lambda"></a>　 Lambda

```javascript
export function handler(req) {
  if (errorOccured()) {
    throw new Error("An error occured");
  }

  return { message: "Succeeded" };
}
```

のような関数が定義されている場合，「[3. API のエクスポート](#export-api)」による API 仕様とのバインドを経て

- Lambda Function
- API Gateway の REST API

が作成されるような `sererless.yml` の定義を自動生成し，以下のようにコンパイルされます．

```javascript
export function handler(req, context, callback) {
  if (errorOccured()) {
    callback(new Error("An error occured."));
    return;
  }

  callback(null, { message: "Succeeded" });
  return;
}
```

#### <a name="import-api"></a>2. API のインポート

ソースコード中で，OpenAPI Specification 2.0 に準拠した API 仕様ファイルを `import` 文でインポートすることできます．

ファイルの場所は HTTP URI またはプロジェクトフォルダからの相対ファイルパスで指定します．

```javascript
import api from "http://path/to/swagger.yaml";
```

上記でインポートした API の各々の呼び出しは，変数 `api` のメンバ操作，メンバ関数呼び出しとして記述することが出来ます．

以下の各々の HTTP メソッドと操作が対応します．

- GET <--> メンバ参照: MemberExpression
- POST <--> メンバ関数呼び出し: CallExpression(MemberExpression, \*)
- PUT <--> メンバへの代入: AssignmentExpression(MemberExpression, \*)
- DELETE <--> メンバの削除: UnaryExpression('delete', MemberExpression)

以下に，HTTP メソッド，パス，ヘッダ，ボディ，およびそれに対応する記述を示します．

| メソッド | パス                 | ヘッダ     | ボディ              | 記述例                                                                                       |
| -------- | -------------------- | ---------- | ------------------- | -------------------------------------------------------------------------------------------- |
| `GET`    | `/items`             |            |                     | `items = api.items;`                                                                         |
| `GET`    | `/items/:id`         |            |                     | `item = api.items[id];`                                                                      |
| `GET`    | `/items/:id/props`   |            |                     | `props = api.items[id].props;`                                                               |
| `GET`    | `/items/:id?foo=bar` |            |                     | `item = api.items[id]` **[** `{ foo: 'bar' }` **]** `;`                                      |
| `GET`    | `/items/:id?foo=bar` | `baz: qux` |                     | `item = api.items[id]` **[** `{ foo: 'bar', baz: 'qux' }` **]** `;`                          |
| `POST`   | `/:domain/messages`  |            | `{ quux: 'corge' }` | `api.`**domain**`[domain].messages` **(** `{ quux: 'corge' }` **)** `;` ※                    |
| `POST`   | `/items`             |            | `{ quux: 'corge' }` | `api.items` **(** `{ quux: 'corge' }` **)** `;`                                              |
| `POST`   | `/items/:id?foo=bar` | `baz: qux` | `{ quux: 'corge' }` | `api.items[id]` **[** `{ foo: 'bar', baz: 'qux' }` **]** **(** `{ quux: 'corge' }` **)** `;` |
| `PUT`    | `/items/:id`         | `baz: qux` | `{ quux: 'corge' }` | `api.items[id]` **[** `{ baz: 'qux' }` **]** `= { quux: 'corge' };`                          |
| `DELETE` | `/items/:id`         |            |                     | `delete api.items[id];`                                                                      |

この対応を基に，変数 `api` のメンバ操作，メンバ関数呼び出しを HTTP クライアントを用いた記述にコンパイルします．

※パスパラメータから始まる場合のみ，`api.<パラメータ名>[変数]` とします．

`http://path/to/swagger.yaml`が以下のような内容だったとします．

```yaml
swagger: "2.0"
info:
  title: Awesome API
  description: An awesome API
  version: "1.0.0"
host: "api.endpoint.com"
schemes:
  - http
basePath: /v1
produces:
  - application/json
consumes:
  - application/json
paths:
  /items/{id}:
    post:
      description: Do some task regarding an item
      parameters:
        - name: id
          in: path
          type: string
          required: true
          description: Item ID
        - name: foo
          in: query
          type: string
          required: true
        - name: baz
          in: header
          type: string
          required: true
        - name: params
          in: body
          schema:
            $ref: "#/definitions/Params"
      responses:
        "200":
          description: Succeeded
          schema:
            $ref: "#/definitions/Message"
definitions:
  Params:
    type: object
    properties:
      quux:
        type: string
  Message:
    type: object
    properties:
      message:
        type: string
```

この場合，

```javascript
import api from "http://path/to/swagger.yaml";
api.items[id][{ foo: "bar", baz: "qux" }]({ quux: "corge" });
```

は，以下のような同期的記述にコンパイルされます．

```javascript
import request from "request";
const { _res, _body } = request({
  uri: `http://api.endpoint.com/v1/items/${id}`,
  method: "post",
  contentType: "application/json",
  json: true,
  qs: {
    foo: "bar"
  },
  headers: {
    baz: "qux"
  },
  body: {
    quux: "corge"
  }
});
```

#### <a name="export-api"></a>3. API のエクスポート

アプリ自身の公開する API 仕様が以下の `swagger.yaml` のように定義されていたとします．

```yaml
swagger: "2.0"
info:
  title: Awesome API
  description: An awesome API
  version: "1.0.0"
host: "api.endpoint.com"
schemes:
  - https
basePath: /v1
produces:
  - application/json
consumes:
  - application/json
paths:
  /items/{id}:
    post:
      x-escapin-handler: index.handleItem
      description: Do some task regarding an item
      parameters:
        - name: id
          in: path
          type: string
          required: true
          description: Item ID
        - name: foo
          in: query
          type: string
          required: true
        - name: baz
          in: header
          type: string
          required: true
        - name: params
          in: body
          schema:
            $ref: "#/definitions/Params"
      responses:
        "200":
          description: Succeeded
          schema:
            $ref: "#/definitions/Message"
definitions:
  Params:
    type: object
    properties:
      quux:
        type: string
  Message:
    type: object
    properties:
      message:
        type: string
```

上記の `x-escapin-handler: index.handleItem`は，`POST /items/{id}`が下記の `index.js` のエクスポートされた関数 `handleItem()`に対応することを示しています．

各パラメータは， `<第一引数>.<パラメータのinの値>.<パラメータ名>` で取得することができます．

```javascript
export function handleItem(req) {
  const id = req.path.id;
  const foo = req.query.foo;
  const baz = req.header.baz;
  const quux = req.body.quux;

  if (errorOccured()) {
    throw new Error("An error occured.");
  }

  return { message: "Succeeded" };
}
```

(AWS Lambda を用いる場合) 上記の `index.js` は，以下のようにコンパイルされます．

```javascript
export function handleItem(req, context, callback) {
  const id = req.path.id;
  const foo = req.query.foo;
  const baz = req.header.baz;
  const quux = req.body.quux;

  if (errorOccured()) {
    callback(new Error("An error occured."));
    return;
  }

  callback(null, { message: "Succeeded" });
  return;
}
```

#### <a name="async"></a>4. 非同期処理の同期的記述

Escapin では，コールバック関数，`async`, `await`, `Promise` を用いた非同期処理を全く意識せずにプログラムを記述することが出来ます．

ライブラリ `request`, `aws-sdk`については，コールバック関数を引数に持つ関数名を自動で抽出出来ており，以下のような同期的記述で書いておけば自動的に`async`, `await`, `Promise` を用いた記述に変換されます．

コールバック関数の入れ子で記述されているコードがあったとします．

```javascript
function func() {
  call(arg, (err, data1, data2) => {
    if (err) {
      handleError(err);
    } else {
      doSomething(data1, data2);
    }
  });
}
```

このコードを同期的記述に変換すると以下のようになります．

```javascript
function func() {
  try {
    const { data1, data2 } = call(arg);
    doSomething(data1, data2);
  } catch (err) {
    handleError(err);
  }
}
```

さらに，上記コードは`async`, `await`, `Promise` を用いた記述に変換されます．

```javascript
async function func() {
  try {
    const _data = await new Promise((resolve, reject) => {
      call(arg, (err, _data1, _data2) => {
        if (err) reject(err);
        else resolve({ _data1, _data2 });
      });
    });
    doSomething(_data._data1, _data._data2);
  } catch (err) {
    handleError(err);
  }
}
```

上記のような同期的記述は，制御構文の中に記述しても正しく変換できます．

##### 非同期呼び出しによって得られたコレクションの for, for-in, for-of 文

```javascript
for (const item of api.call(arg)) {
  doSomething(item);
}
```

は，以下のようにコンパイルされます．

```javascript
const _data = await new Promise((resolve, reject) => {
  apis.call(arg, (err, data) => {
    if (err) reject(err);
    else resolve(data);
  });
});
for (const item of _data) {
  doSomething(item);
}
```

##### 内部に非同期呼び出しのある for, for-in, for-of 文（並列実行可）

```javascript
for (const arg of args) {
  apis.call(arg);
}
```

は，以下のようにコンパイルされます．

```javascript
const _promises = [];
for (const arg of args) {
  _promises.push(
    (async () => {
      await new Promise((resolve, reject) => {
        apis.call(arg, (err, data) => {
          if (err) reject(err);
          else resolve(data);
        });
      });
    })()
  );
}
await Promise.all(_promises);
```

##### 内部に非同期呼び出しのある for, for-in, for-of 文（並列実行不可）

```javascript
let sum = 0;
for (const arg of args) {
  sum += apis.call(arg);
}
```

は，for 文の外部変数に依存するため，以下のようにコンパイルされます．

```javascript
let sum = 0;
for (const arg of args) {
  const _data = await new Promise((resolve, reject) => {
    apis.call(arg, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
  sum += _data;
}
```

##### while，do-while 文

```javascript
while ((data = api.call(arg)) === null) {
  doSomething(data);
}
```

は，以下のようにコンパイルされます．

```javascript
let _data = await new Promise((resolve, reject) => {
  apis.call(arg, (err, data) => {
    if (err) reject(err);
    else resolve(data);
  });
});
while ((data = _data) === null) {
  doSomething(data);
  _data = await new Promise((resolve, reject) => {
    apis.call(arg, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}
```

##### if-else 文

```javascript
if (api.call(arg)) {
  doSomething();
} else if (api.call2(arg)) {
  doSomething2();
}
```

は，以下のようにコンパイルされます．

```javascript
const _data = await new Promise((resolve, reject) => {
  apis.call(arg, (err, data) => {
    if (err) reject(err);
    else resolve(data);
  });
});
if (_data) {
  doSomething();
} else {
  let _data2 = await new Promise((resolve, reject) => {
    apis.call2(arg, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
  if (_data2) {
    doSomething2();
  }
}
```

##### switch-case 文

```javascript
switch (api.call(arg)) {
  case "foo":
    api.call2(arg);
    break;
  case "bar":
    api.call3(arg);
    break;
  default:
    break;
}
```

は，以下のようにコンパイルされます．

```javascript
let _promise;
const _data = await new Promise((resolve, reject) => {
  apis.call(arg, (err, data) => {
    if (err) reject(err);
    else resolve(data);
  });
});
switch (_data) {
  case "foo":
    await new Promise((resolve, reject) => {
      apis.call2(arg, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
    break;
  case "bar":
    await new Promise((resolve, reject) => {
      apis.call3(arg, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
    break;
  default:
    break;
}
```

##### コールバック関数を引数に持つ関数 (Array.prototype.forEach 等)

現状， `map` , `forEach` のみ並行動作するコードに変換されます．

```javascript
args.map(arg => api.call(arg));
args.forEach(arg => api.call(arg));
```

は，以下のようにコンパイルされます．

`map`はコールバック関数を非同期処理し，全てを `await` しています．

一方で `forEach` は **各コールバック関数の終了を全て待たずに次の行に進む** ことに注意してください．
全ての iteration を終わらせて次に進みたい場合は， `forEach` の代わりに `for-of` 文をご利用ください．

```javascript
await Promise.all(args.map(async arg => await api.call(arg)));
args.forEach(async arg => await api.call(arg));
```

それ以外の関数は，コールバック関数内で非同期処理の終了を待つ，以下のような記述にコンパイルされます（ `deasync` という同期化ライブラリを用います）．

```javascript
import deasync from "deasync";
args.some(arg => {
  let _data;
  let done = false;
  new Promise((resolve, reject) => {
    apis.call(arg, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  }).then(data => {
    _data = data;
    done = true;
  });
  deasync.loopWhile(_ => !done);
  return _data;
});
```

#### <a name="compatibility"></a>5. 非同期的記述の許容

同期的記述は未だにコールバック関数の指定が必要なレガシーなライブラリに対して非常に有効ですが，
コードの全てを同期的記述で書く必要はありません．

今時のよくメンテされたライブラリでは，デフォルトで `Promise` を返却する関数も多くなってきています．
そのような関数には `await` を予め付与しておくことで，コンパイル後もそのまま正しい形で残ります．

例えば，

```javascript
args.map(arg => await promisifiedFunc(arg));
```

という記述は，このままでは動作しませんが
「コールバック関数を引数に持つ関数 (Array.prototype.forEach 等)」と同様に以下のようにコンパイルされます．

```javascript
await Promise.all(args.map(async arg => await promisifiedFunc(arg)));
```
