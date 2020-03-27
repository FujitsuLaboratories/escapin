![Escapin](https://raw.githubusercontent.com/FujitsuLaboratories/escapin/master/docs/assets/escapin-1280x324-large.png)

<h2 align='center'>the transpiler for escaping from complicated usage<br />of cloud services and APIs</h2>

<p align='center'>
<a href="https://www.npmjs.com/package/escapin"><img src="https://img.shields.io/npm/v/escapin.svg?style=flat" alt="npm version" /></a> <a href="https://github.com/FujitsuLaboratories/escapin/actions"><img src="https://github.com/FujitsuLaboratories/escapin/workflows/release/badge.svg" alt="Build Status" /></a> <a href="https://libraries.io/npm/escapin"><img src="https://img.shields.io/librariesio/release/npm/escapin.svg?style=flat" alt="dependencies Status" /></a> <a href="https://codecov.io/gh/FujitsuLaboratories/escapin"><img src="https://img.shields.io/codecov/c/gh/FujitsuLaboratories/escapin.svg?style=flat" alt="codecov" /></a> <a href="https://github.com/prettier/prettier"><img src="https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat" alt="code style: prettier" /></a> <a href="LICENSE"><img src="http://img.shields.io/badge/license-MIT-blue.svg?style=flat" alt="MIT License" /></a>
</p>

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)
  - [CLI options](#cli-options)
- [Configuration](#configuration)
- [Transpilation features](#features)
  - [Storage](#storage)
  - [Function](#function)
  - [Importing open APIs](#import-api)
  - [Publishing your API](#publish-api)
  - [Auto-completing asynchronous features](#async)
- [Publications](#publications)
- [License](#license)
- [日本語ドキュメント](docs/users_guide.md)

## <a name="prerequisites"></a>Prerequisites

1. [Node.js](https://nodejs.org/) 10.x or later
2. [Serverless Framework](https://serverless.com/)

## <a name="installation"></a>Installation

```sh
npm install --save-dev escapin
```

## <a name="usage"></a>Usage

Escapin provides CLI `escapin` that works on Node.js project directories containing `./package.json`.

First, append the following scripts in `package.json`:

```json
{
  "scripts": {
    "build": "escapin",
    "start": "cd build && serverless deploy"
  }
}
```

Then, run `build` and `start` on the project folder:

```sh
npm run build
npm start
```

Escapin transpiles your source code into executable one as a serverless application, and generates `serverless.yml` that can be used for deploying the programs to cloud services by [Serverless Framework](https://serverless.com/).

### <a name="cli-options"></a>CLI options

```
Usage: escapin [options]

Options:
  -V, --version         output the version number
  -d, --dir <dir>       working directory (default: ".")
  --ignore-path <path>  specify path of ignore file (default: ".gitignore")
  -h, --help            output usage information
```

## <a name="configuration"></a>Configuration

You can give configuration information to Escapin CLI by using the following ways:

| Place                                  | Format       |
| -------------------------------------- | ------------ |
| `escapin` property in `package.json`   | JSON         |
| `.escapinrc`                           | JSON or YAML |
| `.escapinrc.json`                      | JSON         |
| `.escapinrc.yaml` or `.escapinrc.yml`  | YAML         |
| `.escapinrc.js` or `escapin.config.js` | JavaScript   |

Here is the example of JSON configuration file `.escapinrc`.

```json
{
  "name": "sendmail",
  "api_spec": "swagger.yaml",
  "credentials": [{ "api": "mailgun API", "basicAuth": "api:<YOUR_API_KEY>" }],
  "platform": "aws",
  "default_storage": "table",
  "output_dir": "build"
}
```

```javascript
module.exports = {
  name: "sendmail",
  api_spec: "swagger.yaml",
  credentials: [{ api: "mailgun API", basicAuth: "api:<YOUR_API_KEY>" }],
  platform: "aws",
  default_storage: "table",
  output_dir: "build",
};
```

|       Name        | Description                                                            | Default |
| :---------------: | ---------------------------------------------------------------------- | :-----: |
|      `name`       | name of the application                                                |         |
|    `api_spec`     | path of the specification file of the API published by the application |         |
|   `credentials`   | credentials required in calling external APIs                          |         |
|    `platform`     | cloud platform where the application is being deployed                 |  `aws`  |
| `default_storage` | the storage type that are selected by default                          | `table` |
|   `output_dir`    | directory where the transpilcation artifacts are being stored          | `build` |

## <a name="features"></a>Transpilation features

---

### <a name="storage"></a>Storage

You can use several kinds of storage services just like a first-class object in JavaScript.
By declaring an empty object placing a special type annotation (e.g., `bucket`) you can create a resource in that type of storage services.

You can use both canonical type `platform.storageType` (e.g., `aws.bucket`) and shorthand type `storageType` (e.g., `bucket`) for storage objects; `platform` in the configuration file is used in shorthand types.
If you omit a type annotation, `default_storage` is used as that type by default.
In v0.2.x, `bucket` and `table` is available for storage types; `bucket` represents a bucket in object storage, and `table` represents a table in NoSQL datastore service.

```javascript
export const foo: aws.bucket = {}; // AWS S3 Bucket
export const bar: bucket = {}; // AWS S3 Bucket
export const baz: table = {}; // AWS DynamoDB Table
export const qux = {}; // AWS DyanmoDB Table
```

Here are the usage example of storage objects:

```javascript
export const foo: bucket = {};

foo[id] = bar; // uploading data
baz = foo[id]; // downloading data
qux = Object.keys(foo); // obtaining keys of data
delete foo[id]; // deleting existing data
```

---

#### Input

---

##### `index.js`

```javascript
export const foo: table = {};

foo[id] = bar;
```

##### `.escapinrc.js`

```javascript
module.exports = {
  platform: "aws",
  ...
};
```

---

#### Output

---

##### `index.js`

```javascript
import { DynamoDB } from "aws-sdk";

await new Promise((resolve, reject) => {
  new DynamoDB().putItem(
    {
      TableName: "foo-9fe932f9-32e7-49f7-a341-0dca29a8bb32",
      Item: {
        key: { S: id },
        type: { S: typeof bar },
        value: {
          S:
            typeof bar === "object" || typeof bar === "function"
              ? JSON.stringify(bar)
              : bar,
        },
      },
    },
    (err, _temp) => {
      if (err) {
        reject(err);
      } else {
        resolve(_temp);
      }
    }
  );
});
```

##### `serverless.yml`

```yaml
resources:
  Resources:
    fooTable:
      Type: AWS::DynamoDB::Table
      Properties:
        TableName: foo-9fe932f9-32e7-49f7-a341-0dca29a8bb32
        KeySchema:
          - AttributeName: key
            KeyType: HASH
        AttributeDefinitions:
          - AttributeName: key
            AttributeType: S
        ProvisionedThroughput:
          ReadCapacityUnits: 5
          WriteCapacityUnits: 5
    escapinFunctionRole:
      Properties:
        Policies:
          - PolicyName: foo-9fe932f9-32e7-49f7-a341-0dca29a8bb32-FullAccess
            PolicyDocument:
              Version: "2012-10-17"
              Statement:
                - Effect: Allow
                  Action:
                    - "dynamodb:ListGlobalTables"
                    - "dynamodb:ListTables"
                  Resource: "*"
                - Effect: Allow
                  Action: "dynamodb:*"
                  Resource:
                    "Fn::GetAtt":
                      - fooTable
                      - Arn
```

---

### <a name="function"></a>Function

---

#### Input

---

##### `index.js`

```javascript
export function handler(req) {
  if (errorOccured()) {
    throw new Error("[400] An error occured");
  }

  return { message: "Succeeded" };
}
```

##### `.escapinrc.js`

```javascript
module.exports = {
  name: "myapp",
  platform: "aws",
  api_spec: "swagger.yaml",
  ...
};
```

##### `swagger.yaml`

```yaml
swagger: "2.0"
info:
  version: "1.0.0"
  title: "myapp"
host: "myapp.org"
basePath: "/v1"
schemes:
  - "http"
produces:
  - "application/json"
paths:
  /handle:
    get:
      summary: "handler"
      x-escapin-handler: "index.handler"
      parameters: []
      responses:
        200:
          schema:
            $ref: "#/definitions/Message"
        400:
          schema:
            $ref: "#/definitions/Error"
  ...

```

---

#### Output

---

##### `index.js`

```javascript
export function handler(req, context, callback) {
  if (errorOccured()) {
    callback(new Error("[400] An error occured."));
    return;
  }

  callback(null, { message: "Succeeded" });
  return;
}
```

##### `serverless.yml`

```yaml
functions:
  handlerFunction:
    handler: index.handler
    runtime: nodejs10.x
    role: escapinFunctionRole
    events:
      - http:
          path: handle
          method: get
          cors: true
          integration: lambda
resources:
  Resources:
    escapinFunctionRole:
      Type: "AWS::IAM::Role"
      Properties:
        Path: /escapin/
        RoleName: myappEscapinFunctionRole
        AssumeRolePolicyDocument:
          Version: "2012-10-17"
          Statement:
            - Effect: Allow
              Principal:
                Service:
                  - lambda.amazonaws.com
              Action: "sts:AssumeRole"
        Policies: ...
```

---

### <a name="import-api"></a>Importing open APIs

---

#### Usage

```javascript
import api from "http://path/to/swagger.yaml";
```

|  Method  | Path                 | Header     | Body                | Example                                                                                      |
| :------: | -------------------- | ---------- | ------------------- | -------------------------------------------------------------------------------------------- |
|  `GET`   | `/items`             |            |                     | `items = api.items;`                                                                         |
|  `GET`   | `/items/:id`         |            |                     | `item = api.items[id];`                                                                      |
|  `GET`   | `/items/:id/props`   |            |                     | `props = api.items[id].props;`                                                               |
|  `GET`   | `/items/:id?foo=bar` |            |                     | `item = api.items[id]` **[** `{ foo: 'bar' }` **]** `;`                                      |
|  `GET`   | `/items/:id?foo=bar` | `baz: qux` |                     | `item = api.items[id]` **[** `{ foo: 'bar', baz: 'qux' }` **]** `;`                          |
|  `POST`  | `/:domain/messages`  |            | `{ quux: 'corge' }` | `api.`**domain**`[domain].messages` **(** `{ quux: 'corge' }` **)** `;`                      |
|  `POST`  | `/items`             |            | `{ quux: 'corge' }` | `api.items` **(** `{ quux: 'corge' }` **)** `;`                                              |
|  `POST`  | `/items/:id?foo=bar` | `baz: qux` | `{ quux: 'corge' }` | `api.items[id]` **[** `{ foo: 'bar', baz: 'qux' }` **]** **(** `{ quux: 'corge' }` **)** `;` |
|  `PUT`   | `/items/:id`         | `baz: qux` | `{ quux: 'corge' }` | `api.items[id]` **[** `{ baz: 'qux' }` **]** `= { quux: 'corge' };`                          |
| `DELETE` | `/items/:id`         |            |                     | `delete api.items[id];`                                                                      |

---

#### Input

---

##### `index.js`

```javascript
import api from "http://path/to/swagger.yaml";
api.items[id][{ foo: "bar", baz: "qux" }]({ quux: "corge" });
```

##### `http://path/to/swagger.yaml`

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

---

#### Output

---

##### `index.js`

```javascript
import request from "request";
const { _res, _body } = request({
  uri: `http://api.endpoint.com/v1/items/${id}`,
  method: "post",
  contentType: "application/json",
  json: true,
  qs: {
    foo: "bar",
  },
  headers: {
    baz: "qux",
  },
  body: {
    quux: "corge",
  },
});
```

---

### <a name="publish-api"></a>Publishing your API

---

#### Input

---

##### `index.js`

```javascript
export function handleItem(req) {
  const id = req.path.id;
  const foo = req.query.foo;
  const baz = req.header.baz;
  const quux = req.body.quux;

  if (errorOccured()) {
    throw new Error("[400] An error occured.");
  }

  return { message: "Succeeded" };
}
```

##### `swagger.yaml`

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
          schema:
            $ref: "#/definitions/Message"
        "400":
          schema:
            $ref: "#/definitions/Error"
definitions:
  Params:
    type: object
    properties:
      quux:
        type: string
```

---

#### Output

---

##### `index.js`

```javascript
export function handleItem(req, context, callback) {
  const id = req.path.id;
  const foo = req.query.foo;
  const baz = req.header.baz;
  const quux = req.body.quux;

  if (errorOccured()) {
    callback(new Error("[400] An error occured."));
    return;
  }

  callback(null, { message: "Succeeded" });
  return;
}
```

##### `serverless.yml`

```yaml
functions:
  handleItemFunction:
    handler: index.handleItem
    runtime: nodejs10.x
    role: escapinFunctionRole
    events:
      - http:
          path: 'items/{id}'
          method: post
          cors: true
          integration: lambda
  ...
```

---

### <a name="async"></a>Auto-completing asynchronous features

---

#### Destructuring nesting callbacks

---

##### Original

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

---

##### Destructured

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

---

##### Asynchronized

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

---

#### for, for-in, for-of (collection should be obtained asynchronously)

---

##### Input

```javascript
for (const item of api.call(arg)) {
  doSomething(item);
}
```

---

##### Output

```javascript
const _data = await new Promise((resolve, reject) => {
  api.call(arg, (err, data) => {
    if (err) reject(err);
    else resolve(data);
  });
});
for (const item of _data) {
  doSomething(item);
}
```

---

#### for, for-in, for-of (executable in parallel)

---

##### Input

```javascript
for (const arg of args) {
  api.call(arg);
}
```

---

##### Output

```javascript
const _promises = [];
for (const arg of args) {
  _promises.push(
    (async () => {
      await new Promise((resolve, reject) => {
        api.call(arg, (err, data) => {
          if (err) reject(err);
          else resolve(data);
        });
      });
    })()
  );
}
await Promise.all(_promises);
```

---

#### for, for-in, for-of (NOT executable in parallel)

---

##### Input

```javascript
let sum = 0;
for (const arg of args) {
  sum += api.call(arg);
}
```

---

##### Output

```javascript
let sum = 0;
for (const arg of args) {
  const _data = await new Promise((resolve, reject) => {
    api.call(arg, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
  sum += _data;
}
```

---

#### while，do-while

---

##### Input

```javascript
while ((data = api.call(arg)) === null) {
  doSomething(data);
}
```

---

##### Output

```javascript
let _data = await new Promise((resolve, reject) => {
  api.call(arg, (err, data) => {
    if (err) reject(err);
    else resolve(data);
  });
});
while ((data = _data) === null) {
  doSomething(data);
  _data = await new Promise((resolve, reject) => {
    api.call(arg, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}
```

---

#### if-else

---

##### Input

```javascript
if (api.call(arg)) {
  doSomething();
} else if (api.call2(arg)) {
  doSomething2();
}
```

---

##### Output

```javascript
const _data = await new Promise((resolve, reject) => {
  api.call(arg, (err, data) => {
    if (err) reject(err);
    else resolve(data);
  });
});
if (_data) {
  doSomething();
} else {
  let _data2 = await new Promise((resolve, reject) => {
    api.call2(arg, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
  if (_data2) {
    doSomething2();
  }
}
```

---

#### switch-case

---

##### Input

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

---

##### Output

```javascript
let _promise;
const _data = await new Promise((resolve, reject) => {
  api.call(arg, (err, data) => {
    if (err) reject(err);
    else resolve(data);
  });
});
switch (_data) {
  case "foo":
    await new Promise((resolve, reject) => {
      api.call2(arg, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
    break;
  case "bar":
    await new Promise((resolve, reject) => {
      api.call3(arg, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
    break;
  default:
    break;
}
```

---

#### functions that require callback functions as an argument (e.g., Array#forEach)

---

##### Input

```javascript
// special rules are applied for Array#map and Array#forEach
args.map((arg) => api.call(arg));
args.forEach((arg) => api.call(arg));

args.some((arg) => api.call(arg));
```

---

##### Output

```javascript
import deasync from "deasync";

await Promise.all(args.map(async (arg) => await api.call(arg)));
args.forEach(async (arg) => await api.call(arg));

args.some((arg) => {
  let _data;
  let done = false;
  new Promise((resolve, reject) => {
    api.call(arg, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  }).then((data) => {
    _data = data;
    done = true;
  });
  deasync.loopWhile((_) => !done);
  return _data;
});
```

---

#### asynchronous features appearing in input

---

##### Input

```javascript
args.map(arg => await promisifiedFunc(arg));
```

---

##### Output

```javascript
await Promise.all(args.map(async (arg) => await promisifiedFunc(arg)));
```

---

## <a name="publications"></a>Publications

- Kosaku Kimura, Atsuji Sekiguchi, Shridhar Choudhary and Tadahiro Uehara, ["A JavaScript Transpiler for Escaping from Complicated Usage of Cloud Services and APIs,"](https://doi.org/10.1109/APSEC.2018.00021) [2018 25th Asia-Pacific Software Engineering Conference (APSEC)](http://www.apsec2018.org/), Nara, Japan, 2018, pp. 69-78.

  - [Preprint](https://www.researchgate.net/publication/330533667_A_JavaScript_Transpiler_for_Escaping_from_Complicated_Usage_of_Cloud_Services_and_APIs)

- [An Introduction of a Technology for Simplifying Serverless Application Programming in AWS with Node.js](https://speakerdeck.com/kimusaku/node-dot-jsdefalseawssabaresuapuripuroguraminguwo-jian-dan-nisuruji-shu-falseyan-jiu-shao-jie-an-introduction-of-a-technology-for-simplifying-serverless-application-programming-in-aws-with-node-dot-js), [JAWS DAYS 2019](https://jawsdays2019.jaws-ug.jp/)

- [FaaS 上のコードをもっとシンプルに書くためのトランスパイラ](https://speakerdeck.com/kimusaku/serverless-meetup-tokyo-number-13), [Serverless Meetup Tokyo #13](https://serverless.connpass.com/event/138983/)

## <a name="license"></a>License

[MIT](https://github.com/FujitsuLaboratories/escapin/blob/master/LICENSE)

[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2FFujitsuLaboratories%2Fescapin.svg?type=large)](https://app.fossa.io/projects/git%2Bgithub.com%2FFujitsuLaboratories%2Fescapin?ref=badge_large)
