import type { Knex } from '../types'
import { Inject,Service } from 'typedi'
import { User } from '../entities'
import { Repository } from './Repository'

export interface UserCriteria {
  id: string
  username: string
  idp_user_id: string
}

export interface UserField {
  id: string
  username: string
  idp_user_id: string
  active: boolean
}

@Service()
export class UserRepository extends Repository<User, UserCriteria> {
  constructor(@Inject('DB_CONNECTION') public readonly db: Knex) {
    super(db)
  }

  reducer({ id, username, idp_user_id, active }: UserField) {
    return new User({
      id,
      username,
      idpUserId: idp_user_id,
      active
    })
  }
}
