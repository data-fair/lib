import { test } from 'node:test'
import assert from 'node:assert/strict'
import { webPageLabel, attachmentFilename } from '@data-fair/lib-utils/format/attachment.js'

test('webPageLabel: URL avec protocole → hostname sans www', () => {
  assert.equal(webPageLabel('https://www.data.gouv.fr/foo'), 'data.gouv.fr')
  assert.equal(webPageLabel('http://example.com'), 'example.com')
})

test('webPageLabel: URL sans protocole → http:// ajouté', () => {
  assert.equal(webPageLabel('data.gouv.fr/foo'), 'data.gouv.fr')
})

test('webPageLabel: invalide → valeur brute', () => {
  assert.equal(webPageLabel('not a url !'), 'not a url !')
})

test('webPageLabel: vide → chaîne vide', () => {
  assert.equal(webPageLabel(''), '')
  assert.equal(webPageLabel(undefined as any), '')
})

test('attachmentFilename: chemin complet → nom de fichier', () => {
  assert.equal(attachmentFilename('https://x.com/files/photo.jpg'), 'photo.jpg')
})

test('attachmentFilename: query et fragment ignorés', () => {
  assert.equal(attachmentFilename('/a/b/file.pdf?v=2#section'), 'file.pdf')
})

test('attachmentFilename: encodage URI décodé', () => {
  assert.equal(attachmentFilename('/files/photo%20finale.png'), 'photo finale.png')
})

test('attachmentFilename: encodage invalide → brut, dernier segment', () => {
  assert.equal(attachmentFilename('/files/%E0%A4%A.jpg'), '%E0%A4%A.jpg')
})

test('attachmentFilename: vide → chaîne vide', () => {
  assert.equal(attachmentFilename(''), '')
  assert.equal(attachmentFilename(undefined as any), '')
})
