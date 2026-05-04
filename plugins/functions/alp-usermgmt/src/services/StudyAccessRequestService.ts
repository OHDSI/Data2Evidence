import { Service } from 'typedi'
import { v4 as uuidv4 } from 'uuid'
import { GroupAccessRequest } from '../entities'
import { StudyAccessRequest } from '../dtos'
import { StudyAccessRequestCriteria, GroupAccessRequestField, GroupAccessRequestRepository } from '../repositories'
import { B2cGroupService } from './B2cGroupService'
import { AccessRequestAction, ITokenUser } from '../types'
import { createLogger } from '../Logger'
import { UserGroupService } from './UserGroupService'

@Service()
export class StudyAccessRequestService {
  private readonly logger = createLogger(this.constructor.name)

  constructor(
    private readonly groupService: B2cGroupService,
    private readonly userGroupService: UserGroupService,
    private readonly groupAccessRequestRepo: GroupAccessRequestRepository
  ) {}

  async getStudyAccessRequestList(
    criteria: { [key in keyof StudyAccessRequestCriteria]?: StudyAccessRequestCriteria[key] } = {}
  ): Promise<StudyAccessRequest[]> {
    return await this.groupAccessRequestRepo.getStudyAccessRequestList(criteria)
  }

  async addRequest(
    userId: string,
    studyId: string,
    role: string,
    tokenUser: ITokenUser
  ): Promise<GroupAccessRequest | undefined> {
    const group = await this.groupService.getGroupByStudyRole(studyId, role)
    if (!group) {
      this.logger.error(`Unable to find group for study ${studyId}, role ${role}`)
      throw new Error(`Unable to find group for study ${studyId}, role ${role}`)
    }
    const groupId = group.id

    const exists = await this.groupAccessRequestRepo.exists({ user_id: userId, group_id: groupId, status: null })
    if (exists) {
      this.logger.info(`Study access request for user ${userId}, group ${groupId} already exists`)
      return
    }
    this.logger.info(`Adding new study access request for user ${userId}, group ${groupId} ${groupId}`)
    try {
      const accessReq: Partial<GroupAccessRequestField> = { id: uuidv4(), user_id: userId, group_id: groupId }
      return await this.groupAccessRequestRepo.create(accessReq, tokenUser)
    } catch (err) {
      const errMsg = `Error when adding study access request for user ${userId}, group ${groupId} ${groupId}: ${JSON.stringify(
        err
      )}`
      this.logger.error(errMsg)
      throw new Error(errMsg)
    }
  }

  async handleRequest(
    requestId: string,
    userId: string,
    groupId: string,
    action: AccessRequestAction,
    tokenUser: ITokenUser
  ): Promise<GroupAccessRequest> {
    const group = await this.groupService.getGroup(groupId)
    if (!group) {
      this.logger.error(`Unable to find group for ${groupId}`)
      throw new Error(`Unable to find group for ${groupId}`)
    }
    const criteria: Partial<StudyAccessRequestCriteria> = { id: requestId, user_id: userId, group_id: groupId }
    const accessReq = await this.groupAccessRequestRepo.getStudyAccessRequest(criteria)
    if (typeof accessReq === 'undefined') {
      throw new Error(`Study access request ${requestId} for user ${userId}, group ${groupId} does not exist`)
    }

    const trx = await this.groupAccessRequestRepo.getTransaction()
    this.logger.info(`Proceed to ${action} study access request for user ${userId}, group ${groupId}`)
    try {
      const updateRequest = this.createUpdateRequest(action, tokenUser.userId)
      const result = await this.groupAccessRequestRepo.update(updateRequest, criteria, tokenUser, trx)

      if (action === 'approve') {
        await this.userGroupService.registerUserToGroup(userId, groupId, trx)
      }

      // No email sending at the moment
      // const userEmail = accessReq.email
      // await this.emailService.send({
      //   toEmail: userEmail,
      //   templateId: this.getTemplateId(action),
      //   data: {
      //     email: userEmail,
      //     imprintUrl: ''
      //   }
      // })

      await trx.commit()
      return result
    } catch (err) {
      const errMsg = `Error when handling access request for user ${userId}, group ${groupId}: ${JSON.stringify(err)}`
      this.logger.error(errMsg)
      throw new Error(errMsg)
    }
  }

  private createUpdateRequest(action: string, createdUserId: string) {
    if (action === 'approve') {
      return { status: 'Approved', created_by: createdUserId }
    }
    return { status: 'Rejected', created_by: createdUserId }
  }
}
