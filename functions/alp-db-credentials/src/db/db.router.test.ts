import { expect } from 'jsr:@std/expect'
import { describe, it, beforeAll } from 'jsr:@std/testing/bdd'
import { Router } from 'express'
import { DbService } from './db.service.ts'
import { DbRouter } from './db.router.ts'

describe('DbRouter', () => {
  let router: Router
  beforeAll(() => {
    const service = {} as DbService
    router = new DbRouter(service).getRouter()
  })
  describe('has routes', () => {
    const routes = [
      { path: '/list', method: 'get' },
      { path: `/:id`, method: 'get' },
      { path: '/', method: 'post' },
      { path: '/', method: 'put' },
      { path: `/:id`, method: 'delete' }
    ]
    
    for(let i = 0; i < routes.length; i++) {
      it('`$method` exists on $path', () => {
        const route = routes[i]
        expect(router.stack.some(s => Object.keys(s.route.methods).includes(route.method))).toBe(true)
        expect(router.stack.some(s => s.route.path === route.path)).toBe(true)
      })
    }
  })
})
