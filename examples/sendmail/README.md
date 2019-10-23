# sendmail

An application that send emails using [Mailgun API](https://documentation.mailgun.com/en/latest/api_reference.html#api-reference)

## <a name="usage"></a>Usage

```sh
$ cd examples/sendmail

$ escapin

$ cd build

$ serverless deploy
Serverless: Bundling with Webpack...
Time: 5419ms

...

.......................................................................................
Serverless: Stack update finished...
Service Information
service: sendmail
stage: dev
region: us-east-1
stack: sendmail-dev
resources: 29
api keys:
  None
endpoints:
  GET - https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev/csv
  DELETE - https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev/csv/{id}
  GET - https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev/csv/{id}
  POST - https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev/csv
functions:
  csvGETFunction: sendmail-dev-csvGETFunction
  csvIdDELETEFunction: sendmail-dev-csvIdDELETEFunction
  csvIdGETFunction: sendmail-dev-csvIdGETFunction
  csvPOSTFunction: sendmail-dev-csvPOSTFunction
layers:
  None
Serverless: Run the "serverless" command to setup monitoring, troubleshooting and testing.
```

You can request API `https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev/csv` by using the following `curl` command

### `POST /csv`

```sh
$ curl -d 'csv=Alice%2Calice%40example.com%0D%0ABob%2Cbob%40example.com' https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev/csv
{"id":"dd4e7777-fec4-453d-8f84-f85ae822223d"}
```

### `GET /csv`

```sh
$ curl https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev/csv
["dd4e7777-fec4-453d-8f84-f85ae822223d"]
```

### `GET /csv/{id}`

```sh
$ curl https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev/csv/dd4e7777-fec4-453d-8f84-f85ae822223d
"Alice,alice@example.com\r\nBob,bob@example.com"
```

### `DELETE /csv/{id}`

```sh
$ curl -X DELETE https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev/csv/dd4e7777-fec4-453d-8f84-f85ae822223d
"ec27b2d8-8295-4b44-aae8-a3d47e43d4c6 deleted"
```

## Notice

The feature of sending email by using the Mailgun API does NOT work by default. In order to enable it, you must [sign up with Mailgun](https://signup.mailgun.com/new/signup) for obtaining an API key, and use your own domain instead of 'example.com' in the [source code](https://github.com/FujitsuLaboratories/escapin/blob/master/examples/sendmail/instance.js#L33).
