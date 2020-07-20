#!/usr/bin/env node
const { argv } = require('yargs')
const { convert } = require('../dist/convert')

if (argv.source) {
  convert(argv.source)
}
