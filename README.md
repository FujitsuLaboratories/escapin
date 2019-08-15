# Escapin

**the Transpiler for Escaping from Complicated Usage of Cloud Services and APIs**

[![npm version](https://badge.fury.io/js/escapin.svg)](https://badge.fury.io/js/escapin)
[![Build Status](https://travis-ci.org/FujitsuLaboratories/escapin.svg?branch=master)](https://travis-ci.org/FujitsuLaboratories/escapin)
[![dependencies Status](https://david-dm.org/FujitsuLaboratories/escapin/status.svg)](https://david-dm.org/FujitsuLaboratories/escapin)
[![devDependencies Status](https://david-dm.org/FujitsuLaboratories/escapin/dev-status.svg)](https://david-dm.org/FujitsuLaboratories/escapin?type=dev)
[![codecov](https://codecov.io/gh/FujitsuLaboratories/escapin/branch/master/graph/badge.svg)](https://codecov.io/gh/FujitsuLaboratories/escapin)
[![Maintainability](https://api.codeclimate.com/v1/badges/8ecf79ac7b2447edf8e0/maintainability)](https://api.codeclimate.com/v1/badges/8ecf79ac7b2447edf8e0/maintainability)
[![MIT License](http://img.shields.io/badge/license-MIT-blue.svg?style=flat)](LICENSE)

## Prerequisites

1. [Node.js](https://nodejs.org/)
2. [Yarn](https://yarnpkg.com/)
3. [Serverless Framework](https://serverless.com/)

```sh
yarn global add serverless
```

4. The install location is added to your `PATH`

```sh
export PATH="$(yarn global bin):$PATH"
```

## Installation

```sh
yarn global add escapin
```

or

```sh
npm install -g escapin
```

Using Yarn is preferred because Escapin internally uses Yarn to install TypeScript type declarations (@types) for your project.

## Usage

Escapin provides CLI `escapin` that works on Node.js project directories containing `./package.json`.

```sh
cd examples/sendmail

escapin
```

Then, run `serverless deploy` on `./build` folder containing Escapin artifacts.

```sh
cd build

serverless deploy
```

### CLI options

```sh
  -V, --version         output the version number
  -d, --dir <dir>       working directory (default: ".")
  --ignore-path <path>  specify path of ignore file (default: ".gitignore")
  -h, --help            output usage information
```

## Documentation

[Users Guide](docs/users_guide.md)
