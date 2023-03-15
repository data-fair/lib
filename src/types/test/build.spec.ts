import {strict as assert} from 'assert'
import { SimpleObject } from "./types/simple-object"

describe('build.ts script', () => {
  it('should build a simple schema', () => {
    const simpleObject = require('./types/simple-object')
    const o: SimpleObject = simpleObject.validate({"str2": "Str 2"})
    assert.deepEqual(o, {str1: 'Str 1', str2: 'Str 2'})
  })
})
