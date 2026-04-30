import { Injectable, HttpException, SCOPE } from '@danet/core'
import { RequestContextService } from '../common/request-context.service.ts'
import { CreateArtifactDto, UpdateArtifactDto } from './dto/index.ts'
import { UserArtifact as UserArtifactEntity } from './entity/user-artifact.entity.ts'
import { ServiceName } from './enums/index.ts'
import { UserArtifactRepository } from './repository/user-artifact.repository.ts'
import { userArtifactValidator } from './validator/user-artifact.validator.ts';
import { IUserArtifact } from '../../../_shared/user-artifacts/types.ts'
import { createLogger } from '../logger.ts'

export const ArtifactSequenceMapping = {
  [ServiceName.CONCEPT_SETS]: "concept_set_id_seq",
  [ServiceName.ATLAS_COHORT_DEFINITIONS]: "atlas_cohort_definition_id_seq"
}

@Injectable({ scope: SCOPE.REQUEST })
export class UserArtifactService {
  private readonly userId: string
  private logger = createLogger('UserArtifactService')

  constructor(
    private readonly userArtifactRepository: UserArtifactRepository,
    private readonly requestContextService: RequestContextService
  ) {
    this.userId = this.requestContextService.getAuthToken()?.sub
  }

  async getUserServiceArtifact(userId: string, serviceName: ServiceName): Promise<IUserArtifact[]> {
    const artifacts = await this.userArtifactRepository.findUserServiceArtifactsForService(userId, serviceName)
    if (artifacts.length === 0) {
      throw new HttpException(400, `Artifact for userId ${userId} not found in ${serviceName}`)
    }
    const result = artifacts.map((e) =>
      this.convertUserArtifactEntityToUserArtifact(e)
    );
    return result
  }

  async getUserServiceArtifactById(userId: string, serviceName: ServiceName, id: string): Promise<IUserArtifact> {
    const parsedId = this.parseUserArtifactId(id);
    const userArtifact = await this.userArtifactRepository.findUserServiceArtifactByServiceArtifactId(userId, serviceName, parsedId)
    if (!userArtifact) {
      throw new HttpException(400, `Artifact with id ${id} not found in ${serviceName} for user ${this.userId}`)
    }
    return this.convertUserArtifactEntityToUserArtifact(userArtifact)
  }

  async getServiceArtifactById(serviceName: ServiceName, id: string): Promise<IUserArtifact> {
    const parsedId = this.parseUserArtifactId(id);
    const artifact = await this.userArtifactRepository.findByServiceArtifactId(serviceName, parsedId);

    if (!artifact) {
      throw new HttpException(400, `Artifact with id ${id} not found in ${serviceName}`)
    }
    return this.convertUserArtifactEntityToUserArtifact(artifact)
  }

  async createServiceArtifact<T>(serviceName: ServiceName, createArtifactDto: CreateArtifactDto<T>): Promise<IUserArtifact | null> {
    const serviceArtifact = await userArtifactValidator(serviceName, createArtifactDto.serviceArtifact);
    const userArtifact = await this.userArtifactRepository.create({
      id: serviceArtifact.id,
      serviceName: serviceName,
      userId: this.userId,
      artifact: this.removeIdFromUserArtifact(serviceArtifact),
    });

    try {
      return this.userArtifactRepository.save(this.addOwner(userArtifact, true))
    } catch (error) {
      console.error('Error creating user artifact:', error)
      throw new HttpException(500, 'Failed to create user artifact')
    }
  }

  async updateUserServiceArtifactEntity<T>(
    serviceName: ServiceName,
    updateArtifactDto: UpdateArtifactDto<T>
  ): Promise<IUserArtifact> {
    const { id } = updateArtifactDto
    const userArtifact = await this.userArtifactRepository.findUserServiceArtifactByServiceArtifactId(this.userId, serviceName, id)
    
    if (!userArtifact) {
      throw new HttpException(400, `Artifact with id ${id} not found in ${serviceName} for user ${this.userId}`)
    }

    const updatedServiceArtifact = await userArtifactValidator(serviceName, {
      id,
      ...userArtifact.artifact,
      ...updateArtifactDto.serviceArtifact,
    });

    const updatedServiceArtifactColumn = this.removeIdFromUserArtifact(updatedServiceArtifact);
    const updatedUserArtifact = await this.userArtifactRepository.create({
      id,
      serviceName,
      userId: this.userId,
      artifact: updatedServiceArtifactColumn,
    });
    return this.userArtifactRepository.update(updatedUserArtifact);

  }

  async updateServiceArtifactEntity(serviceName: ServiceName, updatedEntity: Record<string, any>): Promise<IUserArtifact> {
    const { id } = updatedEntity
    const parsedId = this.parseUserArtifactId(id)
    const userArtifact = await this.userArtifactRepository.findByServiceArtifactId(serviceName, parsedId)

    if (!userArtifact) {
      throw new HttpException(400, `Artifact with id ${id} not found in ${serviceName}`)
    }

    this.assertMutationAuthorized({
      serviceName,
      operation: 'update',
      artifact: userArtifact,
      artifactId: parsedId,
    })

    const updatedServiceArtifact = await userArtifactValidator(serviceName, {
      id,
      ...userArtifact.artifact,
      ...updatedEntity.serviceArtifact,
    });

    const updatedServiceArtifactColumn = this.removeIdFromUserArtifact(updatedServiceArtifact);
    const updatedUserArtifact = await this.userArtifactRepository.create({
      id: parsedId,
      serviceName,
      userId: this.userId,
      artifact: updatedServiceArtifactColumn,
    });
    return this.userArtifactRepository.update(updatedUserArtifact);
  }

  async getAllServiceArtifacts(serviceName: ServiceName): Promise<IUserArtifact[]> {
    const artifacts = await this.userArtifactRepository.getAllServiceArtifacts(serviceName)
    return artifacts.map((e) =>
      this.convertUserArtifactEntityToUserArtifact(e)
    );
  }

  async getAllUserServiceArtifacts(serviceName: ServiceName, userId: string): Promise<IUserArtifact[]> {
    const userArtifacts = await this.userArtifactRepository.findUserServiceArtifactsForService(userId, serviceName)
    const sharedArtifacts = await this.userArtifactRepository.findSharedArtifacts(userId, serviceName)

    const userArtifactsList = [...userArtifacts, ...sharedArtifacts]
    return userArtifactsList.map((e) =>
      this.convertUserArtifactEntityToUserArtifact(e)
    );
  }

  async deleteUserServiceArtifact(userId: string, serviceName: ServiceName, id: string): Promise<void> {
    const parsedId = this.parseUserArtifactId(id)

    if (serviceName === ServiceName.CONCEPT_SETS) {
      const userArtifact = await this.userArtifactRepository.findByServiceArtifactId(serviceName, parsedId)

      if (!userArtifact) {
        throw new HttpException(400, `Artifact with id ${id} not found in ${serviceName}`)
      }

      this.assertMutationAuthorized({
        serviceName,
        operation: 'delete',
        artifact: userArtifact,
        artifactId: parsedId,
        routeUserId: userId,
      })
    } else {
      const userArtifact = await this.userArtifactRepository.findUserServiceArtifactByServiceArtifactId(
        userId,
        serviceName,
        parsedId,
      )

      if (!userArtifact) {
        throw new HttpException(400, `Artifact with id ${id} not found in ${serviceName}`)
      }
    }

    await this.userArtifactRepository.deleteServiceArtifact(parsedId, serviceName)
  }

  async deleteServiceArtifactEntity(serviceName: ServiceName, entityId: string): Promise<IUserArtifact | null> {
    const parsedId = this.parseUserArtifactId(entityId)
    const userArtifact = await this.userArtifactRepository.findByServiceArtifactId(serviceName, parsedId)

    if (!userArtifact) {
      throw new HttpException(400, `Artifact with id ${entityId} not found in ${serviceName}`)
    }

    this.assertMutationAuthorized({
      serviceName,
      operation: 'delete',
      artifact: userArtifact,
      artifactId: parsedId,
    })

    await this.userArtifactRepository.deleteServiceArtifact(parsedId, serviceName)
  }

  getServiceArtifactSequenceNextval(
    serviceName: ServiceName
  ): Promise<number> {

    if (!Object.keys(ArtifactSequenceMapping).includes(serviceName)) {
      throw new HttpException(400,
        `Service name:${serviceName} does not have a sequence`
      );
    }

    return this.userArtifactRepository.getUserArtifactSequenceNextval(serviceName);
  }

  private addOwner<T>(object: T, isNewEntity = false) {
    if (isNewEntity) {
      return {
        ...object,
        createdBy: this.userId,
        modifiedBy: this.userId
      }
    }
    return {
      ...object,
      modifiedBy: this.userId
    }
  }

  private parseUserArtifactId(id: string | number): number | string {
    // Try to parse id as number.
    // This is required because concept_sets and atlas_cohort_definitions ids are stored as int, but other artifact ids are stored as UUID|string.
    return Number.isNaN(Number(id)) ? id : Number(id);
  }

  private convertUserArtifactEntityToUserArtifact(
    userArtifactEntity: UserArtifactEntity
  ): IUserArtifact {
    // Combine user artifact entity column and id column together into one object
    return {
      ...userArtifactEntity.artifact,
      id: this.parseUserArtifactId(userArtifactEntity.id),
    };
  }

  async patchArtifact(
    serviceName: ServiceName,
    id: string,
    partialData: Record<string, unknown>
  ): Promise<IUserArtifact> {
    const parsedId = this.parseUserArtifactId(id);
    const artifact = await this.userArtifactRepository.findByServiceArtifactId(serviceName, parsedId);

    if (!artifact) {
      throw new HttpException(400, `Artifact not found: ${serviceName}/${id}`)
    }

    this.assertMutationAuthorized({
      serviceName,
      operation: 'patch',
      artifact,
      artifactId: parsedId,
    })

    // Strip id from partial data (id should not be patchable)
    const { id: _id, ...patchFields } = partialData;

    // Merge partial data with existing artifact
    const artifactData = artifact.artifact as Record<string, unknown>;
    const mergedArtifact = { ...artifactData, ...patchFields };

    // Update the artifact without changing user_id (original owner preserved)
    const updatedArtifact = await this.userArtifactRepository.create({
      id: artifact.id,
      serviceName,
      userId: artifact.userId, // Preserve original owner
      artifact: mergedArtifact,
    });

    const updated = await this.userArtifactRepository.update(this.addOwner(updatedArtifact));
    return this.convertUserArtifactEntityToUserArtifact(updated);
  }

  private removeIdFromUserArtifact(
    userArtifact: IUserArtifact
  ): UserArtifactEntity {
    // Remove id from user artifact
    const { id: _id, ...userArtifactEntity } = userArtifact;
    return userArtifactEntity;
  }

  private assertMutationAuthorized(context: {
    serviceName: ServiceName
    operation: 'update' | 'patch' | 'delete'
    artifact: UserArtifactEntity
    artifactId: string | number
    routeUserId?: string
  }): void {
    if (context.serviceName !== ServiceName.CONCEPT_SETS) {
      return
    }
    const requesterSub = this.normalizeId(this.userId)
    const ownerUserId = this.normalizeId(context.artifact.userId)
    const routeUserId = this.normalizeId(context.routeUserId)

    if (!requesterSub) {
      this.logMutationDenied({
        serviceName: context.serviceName,
        operation: context.operation,
        artifactId: context.artifactId,
        requesterSub,
        ownerUserId,
        routeUserId,
        reason: 'missing_principal',
      })
      throw new HttpException(403, 'Forbidden')
    }

    if (routeUserId && routeUserId !== requesterSub) {
      this.logMutationDenied({
        serviceName: context.serviceName,
        operation: context.operation,
        artifactId: context.artifactId,
        requesterSub,
        ownerUserId,
        routeUserId,
        reason: 'route_user_mismatch',
      })
      throw new HttpException(403, 'Forbidden')
    }

    if (!ownerUserId || ownerUserId !== requesterSub) {
      this.logMutationDenied({
        serviceName: context.serviceName,
        operation: context.operation,
        artifactId: context.artifactId,
        requesterSub,
        ownerUserId,
        routeUserId,
        reason: 'owner_mismatch',
      })
      throw new HttpException(403, 'Forbidden')
    }
  }

  private logMutationDenied(payload: {
    serviceName: ServiceName
    operation: 'update' | 'patch' | 'delete'
    artifactId: string | number
    requesterSub?: string
    ownerUserId?: string
    routeUserId?: string
    reason: 'missing_principal' | 'owner_mismatch' | 'route_user_mismatch'
  }): void {
    this.logger.warn('artifact_mutation_denied', payload)
  }

  private normalizeId(value?: string): string | undefined {
    if (typeof value !== 'string') {
      return undefined
    }

    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : undefined
  }
}
