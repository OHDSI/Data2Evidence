import { describe, it } from '@std/testing/bdd'
import { assertEquals } from '@std/assert'
import { isBucketAlreadyExists, isBucketNotFound } from './bucket.util.ts'

describe('isBucketAlreadyExists', () => {
  it('accepts a plain 409', () => {
    assertEquals(isBucketAlreadyExists(409, ''), true)
  })

  it('accepts storage-api v1 duplicate errors sent as HTTP 400', () => {
    const body = '{"statusCode":"409","error":"Duplicate","message":"The resource already exists"}'
    assertEquals(isBucketAlreadyExists(400, body), true)
  })

  it('rejects other failures', () => {
    assertEquals(isBucketAlreadyExists(400, '{"statusCode":"403","error":"Unauthorized","message":"invalid signature"}'), false)
    assertEquals(isBucketAlreadyExists(502, '<html><head><title>502 Bad Gateway</title></head></html>'), false)
  })
})

describe('isBucketNotFound', () => {
  it('accepts a plain 404 and storage-api v1 errors sent as HTTP 400', () => {
    assertEquals(isBucketNotFound(404, ''), true)
    assertEquals(isBucketNotFound(400, '{"statusCode":"404","error":"Bucket not found","message":"Bucket not found"}'), true)
  })

  it('rejects other failures', () => {
    assertEquals(isBucketNotFound(400, '{"statusCode":"403","error":"Unauthorized","message":"invalid signature"}'), false)
    assertEquals(isBucketNotFound(502, '<html></html>'), false)
  })
})
