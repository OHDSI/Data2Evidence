import { Router } from 'express'
import { Service } from 'typedi'
import { BookmarkRouter } from './bookmark/bookmark.router'
import { Logger } from '@alp/alp-base-utils'

@Service()
class Routes {
  private readonly router = Router()
  private readonly log = Logger.CreateLogger(this.constructor.name)

  constructor(private readonly bookmarkRouter: BookmarkRouter) {
    this.router.use('/analytics-svc/api/services/bookmark', this.bookmarkRouter.getRouter())
  }

  getRouter() {
    return this.router
  }
}

export default Routes
