import express from 'express'
import { Service } from 'typedi'
import { UserGroupRouter } from './UserGroupRouter'
import { GroupRouter } from './GroupRouter'
import { UserRouter } from './UserRouter'
import { AlpUserRouter } from './AlpUserRouter'
import { AlpDataAdminRouter } from './AlpDataAdminRouter'
import { MeRouter } from './MeRouter'
import { StudyAccessRequestRouter } from './StudyAccessRequestRouter'
import { MemberRouter } from './MemberRouter'
import { SetupRouter } from './SetupRouter'

@Service()
class Routes {
  public router = express.Router()

  constructor(
    private readonly userGroupRouter: UserGroupRouter,
    private readonly memberRouter: MemberRouter,
    private readonly groupRouter: GroupRouter,
    private readonly userRouter: UserRouter,
    private readonly alpUserRouter: AlpUserRouter,
    private readonly alpDataAdminRouter: AlpDataAdminRouter,
    private readonly meRouter: MeRouter,
    private readonly studyAccessRequestRouter: StudyAccessRequestRouter,
    private readonly setupRouter: SetupRouter
  ) {
    this.router.use('/user-group', this.userGroupRouter.router)
    this.router.use('/member', this.memberRouter.router)
    this.router.use('/group', this.groupRouter.router)
    this.router.use('/user', this.userRouter.router)
    this.router.use('/alp-user', this.alpUserRouter.router)
    this.router.use('/alp-data-admin', this.alpDataAdminRouter.router)
    this.router.use('/me', this.meRouter.router)
    this.router.use('/study/access-request', this.studyAccessRequestRouter.router)
    this.router.use('/setup', this.setupRouter.router)
  }
}

export default Routes
