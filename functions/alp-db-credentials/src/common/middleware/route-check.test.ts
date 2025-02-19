import { NextFunction, Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { checkDbId, checkServiceScope } from './route-check.ts'
import { SERVICE_SCOPE } from '../const.ts'
import { describe, it, beforeEach } from 'jsr:@std/testing/bdd'
import { expect } from 'jsr:@std/expect'
import { spy, assertSpyCalls, assertSpyCall } from 'jsr:@std/testing/mock'

describe('route-check', () => {
  describe('checkDbId', () => {
    const mockRes = {} as unknown as Response
    let mockNext = spy()
    beforeEach(() => {
      mockRes.status = spy(() => mockRes)
      mockRes.send = spy((m) => m)
      mockNext = spy() as NextFunction
    })
    
    it('should return bad request with error message if id is undefined', () => {
      const mockReq = {} as Request
      const result = checkDbId(mockReq, mockRes, mockNext)

      expect(result).toBe('Param is required')
      assertSpyCalls(mockRes.status, 1)
      assertSpyCall(mockRes.status, 0, { args: [400], returned: mockRes })
      assertSpyCalls(mockNext, 0)

    })

    it('should trigger next if id is valid uuid', () => {
      const mockReq = { params: { id: uuidv4() } } as unknown as Request
      checkDbId(mockReq, mockRes, mockNext)

      assertSpyCalls(mockNext, 1)
    })

    it('should return bad request with error message if id is not uuid', () => {
      const mockReq = { params: { id: 'hello' } } as unknown as Request
      const result = checkDbId(mockReq, mockRes, mockNext)

      expect(result).toBe('Param is invalid')
      assertSpyCalls(mockNext, 0)
      assertSpyCalls(mockRes.status, 1)
      assertSpyCall(mockRes.status, 0, { args: [400], returned: mockRes })

    })
  })
  describe('checkServiceScope', () => {

    const mockRes = {} as unknown as Response
    let mockNext = spy()
    beforeEach(() => {
      mockRes.status = spy(() => mockRes)
      mockRes.send = spy((m) => m)
      mockNext = spy() as NextFunction
    })

    it('should return bad request with error message if service scope is undefined', () => {
      const mockReq = {} as Request
      const result = checkServiceScope(mockReq, mockRes, mockNext)

      expect(result).toBe('Query param is required')
      assertSpyCalls(mockRes.status, 1)
      assertSpyCall(mockRes.status, 0, { args: [400], returned: mockRes })
      assertSpyCalls(mockNext, 0)
    })
    it('should return bad request with error message if service scope is not of type string', () => {
      const mockReq = { query: { serviceScope: [SERVICE_SCOPE.INTERNAL] } } as unknown as Request
      const result = checkServiceScope(mockReq, mockRes, mockNext)

      expect(result).toBe('Query param is invalid')
      assertSpyCalls(mockRes.status, 1)
      assertSpyCall(mockRes.status, 0, { args: [400], returned: mockRes })
      assertSpyCalls(mockNext, 0)
    })
    it('should return bad request with error message if service scope is invalid', () => {
      const mockReq = { query: { serviceScope: 'invalid' } } as unknown as Request
      const result = checkServiceScope(mockReq, mockRes, mockNext)

      expect(result).toBe('Query param is invalid')
      assertSpyCalls(mockRes.status, 1)
      assertSpyCall(mockRes.status, 0, { args: [400], returned: mockRes })
      assertSpyCalls(mockNext, 0)
    })
    it('should trigger next if service scope is valid', () => {
      const mockReq = { query: { serviceScope: SERVICE_SCOPE.DATA_PLATFORM } } as unknown as Request
      checkServiceScope(mockReq, mockRes, mockNext)

      assertSpyCalls(mockNext, 1)
    })
  })
})
