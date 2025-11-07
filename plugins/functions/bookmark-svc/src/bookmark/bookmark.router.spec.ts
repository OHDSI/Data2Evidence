import { Router } from 'express'
import { BookmarkRouter } from './bookmark.router'

describe('BookmarkRouter', () => {
  let router: Router

  beforeAll(() => {
    router = new BookmarkRouter().getRouter()
  })

  describe('has routes', () => {
    const routes = [
      { path: '/', method: 'get' },
      { path: `/`, method: 'post' },
      { path: '/:bookmarkId', method: 'put' },
      { path: '/:bookmarkId', method: 'delete' },
      { path: `/bookmarkIds`, method: 'delete' },
    ]

    test.each(routes)('`$method` exists on $path', (route, done) => {
      expect(router.stack.some(s => Object.keys(s.route.methods).includes(route.method))).toBe(true)
      expect(router.stack.some(s => s.route.path === route.path)).toBe(true)
      done()
    })
  })
})
