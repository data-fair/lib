import { describe, it } from 'node:test'
import { strict as assert } from 'assert'
import { webPageLabel, attachmentFilename } from '@data-fair/lib-utils/format/attachment.js'

describe('webPageLabel', () => {
  it('reduces a URL with a protocol to its hostname, without www', () => {
    assert.equal(webPageLabel('https://www.data.gouv.fr/foo'), 'data.gouv.fr')
    assert.equal(webPageLabel('http://example.com'), 'example.com')
  })
  it('assumes http:// when the value carries no protocol', () => {
    assert.equal(webPageLabel('data.gouv.fr/foo'), 'data.gouv.fr')
  })
  it('falls back to the raw value when it is not a URL', () => {
    assert.equal(webPageLabel('not a url !'), 'not a url !')
  })
  it('renders an empty string for an empty value', () => {
    assert.equal(webPageLabel(''), '')
    assert.equal(webPageLabel(undefined as any), '')
  })
})

describe('attachmentFilename', () => {
  it('keeps only the file name of a full path', () => {
    assert.equal(attachmentFilename('https://x.com/files/photo.jpg'), 'photo.jpg')
  })
  it('ignores the query and the fragment', () => {
    assert.equal(attachmentFilename('/a/b/file.pdf?v=2#section'), 'file.pdf')
  })
  it('decodes the URI encoding', () => {
    assert.equal(attachmentFilename('/files/photo%20finale.png'), 'photo finale.png')
  })
  it('keeps the raw last segment when the encoding is invalid', () => {
    assert.equal(attachmentFilename('/files/%E0%A4%A.jpg'), '%E0%A4%A.jpg')
  })
  it('renders an empty string for an empty value', () => {
    assert.equal(attachmentFilename(''), '')
    assert.equal(attachmentFilename(undefined as any), '')
  })
})
