import { Container ,  Service } from 'typedi'
import { createLogger } from '../Logger'
import { UserActivateRequest, UserAddRequest, UserDeleteRequest } from '../types.d.ts'
import { CONTAINER_KEY } from '../const'
import { generatePassword } from '../utils'
import { UserService } from './UserService'
import { UserGroupService } from './UserGroupService'
import { UserField } from '../repositories'
import { LogtoAPI } from '../api'

@Service()
export class MemberService {
  private readonly logger = createLogger(this.constructor.name)

  constructor(
    private readonly userService: UserService,
    private readonly userGroupService: UserGroupService,
    private readonly logtoApi: LogtoAPI
  ) {}

  async addUser(request: UserAddRequest) {
    const { username, groupIds } = request
    let { password } = request

    this.logger.info('Validate existing username')
    const user = await this.userService.getUserByUsername(username)
    if (user != null && user.id != null) {
      this.logger.error(`User ${username} already exist`)
      throw new Error(`User ${username} already exist`)
    }

    const db = Container.get<Knex.Transaction>(CONTAINER_KEY.DB_CONNECTION)
    const trx = await db.transactionProvider()()

    try {
      const newUser = await this.userService.createUser({ username }, trx)
      if (!newUser) {
        this.logger.warn(`Unable to create user ${username}`)
        throw new Error(`Unable to create user ${username}`)
      }

      if (groupIds != null && groupIds.length > 0) {
        for (const groupId of groupIds) {
          await this.userGroupService.addUserToGroup(newUser.id, groupId, trx)
        }
      }

      if (password == null) password = generatePassword()

      const logtoUser = await this.logtoApi.createUser(username, password)
      const idpUserId = logtoUser.id

      this.logger.info('Update IDP user ID')
      const updateFields = { id: newUser.id, idp_user_id: idpUserId }
      await this.userService.updateUser(updateFields, trx)

      await trx.commit()
    } catch (err) {
      await trx.rollback()
      this.logger.error(`Error when adding user: ${JSON.stringify(err)}`)
      throw err
    }
  }

  async deleteUser(request: UserDeleteRequest) {
    const { userId } = request

    const user = await this.userService.getUser(userId)
    if (user == null || user.id == null) {
      this.logger.error(`User ${userId} does not exist`)
      throw new Error(`User ${userId} does not exist`)
    }

    const db = Container.get<Knex.Transaction>(CONTAINER_KEY.DB_CONNECTION)
    const trx = await db.transactionProvider()()

    try {
      await this.userService.deleteUser(userId, trx)
      await this.logtoApi.deleteUser(user.idpUserId)
      await trx.commit()
    } catch (err) {
      await trx.rollback()
      this.logger.error(`Error when deleting user: ${JSON.stringify(err)}`)
      throw err
    }
  }

  async activateUser(request: UserActivateRequest) {
    const { userId, active } = request

    const user = await this.userService.getUser(userId)
    if (user == null || user.id == null) {
      this.logger.error(`User ${userId} does not exist`)
      throw new Error(`User ${userId} does not exist`)
    }

    const db = Container.get<Knex.Transaction>(CONTAINER_KEY.DB_CONNECTION)
    const trx = await db.transactionProvider()()

    try {
      const updateFields: Partial<UserField> = { id: userId, active }
      await this.userService.updateUser(updateFields, trx)
      await this.logtoApi.activateUser(user.idpUserId, active)

      await trx.commit()
    } catch (err) {
      await trx.rollback()
      this.logger.error(`Error when ${active ? 'activating' : 'deactivating'} user: ${JSON.stringify(err)}`)
      throw err
    }
  }
}
