import { describe, it } from '@std/testing/bdd'
import { assertEquals } from '@std/assert'
import { isBucketAlreadyExists } from './bucket.util.ts'

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
