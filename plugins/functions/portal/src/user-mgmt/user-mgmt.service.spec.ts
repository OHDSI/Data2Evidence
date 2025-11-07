import { Test, TestingModule } from '@nestjs/testing'
import { UserMgmtService } from './user-mgmt.service'
import { UserMgmtApi } from './user-mgmt.api'
import { userMgmtApiMockFactory } from './user-mgmt.mock'

describe('UserMgmtService', () => {
  let service: UserMgmtService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserMgmtService, { provide: UserMgmtApi, useFactory: userMgmtApiMockFactory }]
    }).compile()

    service = module.get<UserMgmtService>(UserMgmtService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
