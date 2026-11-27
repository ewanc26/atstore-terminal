#!/usr/bin/env node
import process from 'node:process'
import { pathToFileURL } from 'node:url'
import { main } from './cli/dispatch.js'

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  process.exitCode = await main()
}
