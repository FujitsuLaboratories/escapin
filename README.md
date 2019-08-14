# Escapin

**the Transpiler for Escaping from Complicated Usage of Cloud Services and APIs**

[![npm version](https://badge.fury.io/js/escapin.svg)](https://badge.fury.io/js/escapin)
[![Build Status](https://travis-ci.org/FujitsuLaboratories/escapin.svg?branch=master)](https://travis-ci.org/FujitsuLaboratories/escapin)
[![dependencies Status](https://david-dm.org/FujitsuLaboratories/escapin/status.svg)](https://david-dm.org/FujitsuLaboratories/escapin)
[![devDependencies Status](https://david-dm.org/FujitsuLaboratories/escapin/dev-status.svg)](https://david-dm.org/FujitsuLaboratories/escapin?type=dev)
[![Coverage Status](http://coveralls.io/repos/github/FujitsuLaboratories/escapin/badge.svg?branch=master)](http://coveralls.io/github/FujitsuLaboratories/escapin?branch=master)
[![Maintainability](https://api.codeclimate.com/v1/badges/8ecf79ac7b2447edf8e0/maintainability)](https://api.codeclimate.com/v1/badges/8ecf79ac7b2447edf8e0/maintainability)
[![MIT License](http://img.shields.io/badge/license-MIT-blue.svg?style=flat)](LICENSE)

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

Escapin provides CLI `escapin` that is working on Node.js project directories containing `./package.json`.

```sh
cd examples/sendmail

escapin
```

or

```sh
escapin -d examples/sendmail
```

- CLI options are:

```sh
  -V, --version    Output the version number
  -d, --dir <dir>  Working directory
  -h, --help       Output usage information
```

## Documentation

[Users Guide](docs/users_guide.md)
