import { Injectable, HttpException, SCOPE } from '@danet/core'
import { RequestContextService } from '../common/request-context.service.ts'
import { CreateArtifactDto, UpdateArtifactDto } from './dto/index.ts'
import { UserArtifact as UserArtifactEntity } from './entity/user-artifact.entity.ts'
import { ServiceName } from './enums/index.ts'
import { UserArtifactRepository } from './repository/user-artifact.repository.ts'
import { userArtifactValidator } from './validator/user-artifact.validator.ts';
import { IUserArtifact } from '../../../_shared/user-artifacts/types.ts'

export const ArtifactSequenceMapping = {
  [ServiceName.CONCEPT_SETS]: "concept_set_id_seq",
  [ServiceName.ATLAS_COHORT_DEFINITIONS]: "atlas_cohort_definition_id_seq"
}

@Injectable({ scope: SCOPE.REQUEST })
export class UserArtifactService {
  private readonly userId: string

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
    const userArtifact = await this.userArtifactRepository.findByServiceArtifactId(serviceName, id)

    if (!userArtifact) {
      throw new HttpException(400, `Artifact with id ${id} not found in ${serviceName}`)
    }

    const updatedServiceArtifact = await userArtifactValidator(serviceName, {
      id,
      ...userArtifact.artifact,
      ...updatedEntity.serviceArtifact,
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
    const userArtifact = await this.userArtifactRepository.findUserServiceArtifactByServiceArtifactId(userId, serviceName, id)

    if (!userArtifact) {
      throw new HttpException(400, `Artifact with id ${id} not found in ${serviceName}`)
    }

    await this.userArtifactRepository.deleteServiceArtifact(id, serviceName)
  }

  async deleteServiceArtifactEntity(serviceName: ServiceName, entityId: string): Promise<IUserArtifact | null> {
    const userArtifact = await this.userArtifactRepository.findByServiceArtifactId(serviceName, entityId)

    if (!userArtifact) {
      throw new HttpException(400, `Artifact with id ${entityId} not found in ${serviceName}`)
    }

    await this.userArtifactRepository.deleteServiceArtifact(entityId, serviceName)
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

  private removeIdFromUserArtifact(
    userArtifact: IUserArtifact
  ): UserArtifactEntity {
    // Remove id from user artifact
    const { id: _id, ...userArtifactEntity } = userArtifact;
    return userArtifactEntity;
  }
}