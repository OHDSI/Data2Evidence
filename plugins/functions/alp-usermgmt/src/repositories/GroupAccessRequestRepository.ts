//import type { Knex } from '../types'
import { Inject,Service } from 'typedi'
import { GroupAccessRequest } from '../entities'
import { Repository } from './Repository'
import { StudyAccessRequest } from '../dtos'

export interface GroupAccessRequestCriteria {
  id: string | string[]
  user_id: string | string[]
  group_id: string | string[]
  status: string | null
}

export interface StudyAccessRequestCriteria extends GroupAccessRequestCriteria {
  study_id: string
}

export interface GroupAccessRequestField {
  id: string
  user_id: string
  group_id: string
  created_date: string
}

export interface StudyAccessRequestField extends GroupAccessRequestField {
  username: string
  role: string
  tenant_id: string
  study_id: string
}

@Service()
export class GroupAccessRequestRepository extends Repository<GroupAccessRequest, GroupAccessRequestCriteria> {
  constructor(@Inject('DB_CONNECTION') public readonly db: any) {
    super(db)
  }

  async getStudyAccessRequest(
    criteria: { [key in keyof StudyAccessRequestCriteria]?: StudyAccessRequestCriteria[key] } = {}
  ): Promise<StudyAccessRequest> {
    const query = this.db(this.tableName)
      .innerJoin('user', 'user.id', 'group_access_request.user_id')
      .innerJoin('b2c_group', 'b2c_group.id', 'group_access_request.group_id')
      .select(`${this.tableName}.*`, 'user.username', 'b2c_group.role', 'b2c_group.tenant_id', 'b2c_group.study_id')

    Object.keys(criteria).forEach((c: string) => {
      let field: string
      switch (c) {
        case 'username':
          field = 'user.username'
          break
        case 'study_id':
          field = 'b2c_group.study_id'
          break
        case 'role':
          field = 'b2c_group.role'
          break
        default:
          field = `group_access_request.${c}`
          break
      }

      if (Array.isArray(criteria[c as keyof StudyAccessRequestCriteria])) {
        query.whereIn(field, criteria[c as keyof StudyAccessRequestCriteria] as any)
      } else {
        query.where(field, criteria[c as keyof StudyAccessRequestCriteria] as any)
      }
    })

    return await query.first().then(result => result && this.mapToStudyAccessRequest(result))
  }

  async getStudyAccessRequestList(
    criteria: { [key in keyof StudyAccessRequestCriteria]?: StudyAccessRequestCriteria[key] } = {}
  ): Promise<StudyAccessRequest[]> {
    const query = this.db(this.tableName)
      .innerJoin('user', 'user.id', 'group_access_request.user_id')
      .innerJoin('b2c_group', 'b2c_group.id', 'group_access_request.group_id')
      .select(`${this.tableName}.*`, 'user.username', 'b2c_group.role', 'b2c_group.tenant_id', 'b2c_group.study_id')

    Object.keys(criteria).forEach((c: string) => {
      let field: string
      switch (c) {
        case 'username':
          field = 'user.username'
          break
        case 'study_id':
          field = 'b2c_group.study_id'
          break
        case 'role':
          field = 'b2c_group.role'
          break
        default:
          field = `group_access_request.${c}`
          break
      }

      if (Array.isArray(criteria[c as keyof StudyAccessRequestCriteria])) {
        query.whereIn(field, criteria[c as keyof StudyAccessRequestCriteria] as any)
      } else {
        query.where(field, criteria[c as keyof StudyAccessRequestCriteria] as any)
      }
    })

    return await query.then(result => result.map(row => this.mapToStudyAccessRequest(row)) || [])
  }

  reducer({ id, user_id, group_id }: GroupAccessRequestField) {
    return new GroupAccessRequest({
      id,
      userId: user_id,
      groupId: group_id
    })
  }

  mapToStudyAccessRequest({
    id,
    user_id,
    group_id,
    username,
    role,
    tenant_id,
    study_id,
    created_date
  }: StudyAccessRequestField) {
    return new StudyAccessRequest({
      id,
      userId: user_id,
      groupId: group_id,
      username,
      role,
      tenantId: tenant_id,
      studyId: study_id,
      requestedOn: created_date
    })
  }
}
