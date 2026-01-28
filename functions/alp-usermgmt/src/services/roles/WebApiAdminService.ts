import { Service } from 'typedi'
import { createLogger } from '../../Logger'
import { UserService } from '../UserService'
import { webapiDb } from '../../db/webapi-db'

interface SecUser {
  id: number
  login: string
}

interface SecRole {
  id: number
  name: string
}

@Service()
export class WebApiAdminService {
  private readonly logger = createLogger(this.constructor.name)

  constructor(private readonly userService: UserService) {}

  async register(userId: string): Promise<void> {
    const user = await this.userService.getUser(userId)
    if (!user) {
      throw new Error(`User ${userId} not found`)
    }

    const login = user.idpUserId
    if (!login) {
      throw new Error(`User ${userId} has no idp_user_id - user must log in first`)
    }

    try {
      const adminRole = await webapiDb<SecRole>('sec_role')
        .where('name', 'admin')
        .first()

      if (!adminRole) {
        throw new Error('WebAPI admin role not found in webapi.sec_role')
      }

      let secUser = await webapiDb<SecUser>('sec_user')
        .where('login', login)
        .first()

      if (!secUser) {
        const [insertedUser] = await webapiDb<SecUser>('sec_user')
          .insert({ login, name: login })
          .returning(['id', 'login'])
        secUser = insertedUser
      }

      // Create personal role (WebAPI requires this)
      let personalRole = await webapiDb<SecRole>('sec_role')
        .where('name', login)
        .where('system_role', false)
        .first()

      if (!personalRole) {
        const [insertedRole] = await webapiDb<SecRole>('sec_role')
          .insert({ name: login, system_role: false })
          .returning(['id', 'name'])
        personalRole = insertedRole
      }

      // Assign to personal role
      const existingPersonalAssignment = await webapiDb('sec_user_role')
        .where('user_id', secUser.id)
        .where('role_id', personalRole.id)
        .first()

      if (!existingPersonalAssignment) {
        await webapiDb('sec_user_role').insert({
          user_id: secUser.id,
          role_id: personalRole.id
        })
      }

      // Assign to admin role
      const existingAdminAssignment = await webapiDb('sec_user_role')
        .where('user_id', secUser.id)
        .where('role_id', adminRole.id)
        .first()

      if (!existingAdminAssignment) {
        await webapiDb('sec_user_role').insert({
          user_id: secUser.id,
          role_id: adminRole.id
        })
      }
    } catch (error) {
      this.logger.error(`Failed to register WebAPI admin for ${login}: ${error}`)
      throw error
    }
  }

  async withdraw(userId: string): Promise<void> {
    const user = await this.userService.getUser(userId)
    if (!user) {
      throw new Error(`User ${userId} not found`)
    }

    const login = user.idpUserId
    if (!login) {
      return
    }

    try {
      const secUser = await webapiDb<SecUser>('sec_user')
        .where('login', login)
        .first()

      if (!secUser) {
        return
      }

      const adminRole = await webapiDb<SecRole>('sec_role')
        .where('name', 'admin')
        .first()

      if (!adminRole) {
        throw new Error('WebAPI admin role not found in webapi.sec_role')
      }

      await webapiDb('sec_user_role')
        .where('user_id', secUser.id)
        .where('role_id', adminRole.id)
        .delete()
    } catch (error) {
      this.logger.error(`Failed to withdraw WebAPI admin for ${login}: ${error}`)
      throw error
    }
  }

  async userExists(username: string): Promise<boolean> {
    const secUser = await webapiDb<SecUser>('sec_user')
      .where('login', username)
      .first()
    return !!secUser
  }
}
