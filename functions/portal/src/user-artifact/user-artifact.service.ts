import { ConflictException, Injectable, HttpException, SCOPE } from '@danet/core'
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
    const artifact = await this.userArtifactRepository.findUserServiceArtifactByServiceArtifactId(userId, serviceName, parsedId)
    if (!artifact) {
      throw new HttpException(400, `Artifact with id ${id} not found in ${serviceName}`)
    }
    return this.convertUserArtifactEntityToUserArtifact(artifact)
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
    let artifact = await this.userArtifactRepository.findUserServiceArtifactsForService(this.userId, serviceName)

    if (artifact) {
      const artifactArray = artifact.artifacts

      if (artifactArray) {
        if (this.isArtifactExists(artifactArray, serviceArtifact)) {
          throw new ConflictException(`Artifact for ${serviceName} already exists`)
        }
        artifactArray.push(serviceArtifact)
      } else {
        artifact.artifacts = [serviceArtifact]
      }
    } else {
      artifact = await this.userArtifactRepository.create(
        this.addOwner(
          {
            userId: this.userId,
            serviceName: serviceName,
            artifacts: [serviceArtifact]
          },
          true
        )
      )
    }

    try {
      return this.userArtifactRepository.save(this.addOwner(artifact, true))
    } catch (error) {
      console.error('Error creating user artifact:', error)
      throw new ConflictException('Failed to create user artifact')
    }
  }

  async updateUserServiceArtifactEntity<T>(
    serviceName: ServiceName,
    updateArtifactDto: UpdateArtifactDto<T>
  ): Promise<IUserArtifact> {
    const { id } = updateArtifactDto
    const artifact = await this.userArtifactRepository.findUserServiceArtifactsForService(this.userId, serviceName)

    if (artifact?.artifacts) {
      const index = artifact.artifacts.findIndex(item => item.id === this.parseUserArtifactId(id))
      if (index === -1) {
        throw new HttpException(400, `Artifact with id ${id} not found in ${serviceName}`)
      }

      const updatedServiceArtifact = await userArtifactValidator(serviceName, {
        ...artifact.artifacts[index],
        ...updateArtifactDto.serviceArtifact,
      });
      artifact.artifacts[index] = updatedServiceArtifact;

      const updatedEntity = this.addOwner(artifact)
      return this.userArtifactRepository.save(updatedEntity)
    }

    throw new HttpException(400, `Service ${serviceName} not found for user ${updateArtifactDto.userId}`)
  }

  async updateServiceArtifactEntity(serviceName: ServiceName, updatedEntity: Record<string, any>): Promise<IUserArtifact> {
    const userArtifacts = await this.userArtifactRepository.getAllServiceArtifacts(serviceName)

    if (!userArtifacts || userArtifacts.length === 0) {
      throw new HttpException(400, 'No user artifacts found')
    }

    for (const userArtifact of userArtifacts) {
      const artifacts = userArtifact.artifacts

      if (artifacts) {
        const artifactIndex = artifacts.findIndex(artifact => artifact.id === updatedEntity.id)

        if (artifactIndex !== -1) {
          const updatedServiceArtifact = await userArtifactValidator(serviceName, {
            ...artifacts[artifactIndex],
            ...updatedEntity.serviceArtifact,
          });
          artifacts[artifactIndex] = updatedServiceArtifact;

          console.log('Updated artifact:', JSON.stringify(artifacts[artifactIndex], null, 2));

          userArtifact.artifacts = artifacts;

          // TODO: Only return artifact that was updated, instead of all artifacts
          const savedArtifact = await this.userArtifactRepository.save(userArtifact)

          return savedArtifact
        }
      }
    }

    throw new HttpException(400, 'Service artifact not found');
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
    const artifact = await this.userArtifactRepository.findUserServiceArtifactsForService(userId, serviceName)

    if (artifact?.artifacts) {
      artifact.artifacts = artifact.artifacts.filter(
        item => item.id !== this.parseUserArtifactId(id))
      await this.userArtifactRepository.update(artifact)
    } else {
      throw new HttpException(400, `Artifact with id ${id} for user ${userId} not found in ${serviceName}`)
    }
  }

  async deleteServiceArtifactEntity(serviceName: ServiceName, entityId: string): Promise<IUserArtifact | null> {
    const userArtifacts = await this.userArtifactRepository.getAllServiceArtifacts(serviceName);

    if (!userArtifacts || userArtifacts.length === 0) {
      throw new HttpException(400, 'No user artifacts found');
    }

    for (const userArtifact of userArtifacts) {
      const artifacts = userArtifact.artifacts;

      if (artifacts) {
        const artifactIndex = artifacts.findIndex(artifact => artifact.id === this.parseUserArtifactId(entityId));

        if (artifactIndex !== -1) {
          artifacts.splice(artifactIndex, 1);
          userArtifact.artifacts = [...artifacts];
          await this.userArtifactRepository.save(userArtifact)
          return userArtifact
        }
      }
    }

    throw new HttpException(400, 'Service artifact not found');
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

  private isArtifactExists<T extends { id: string }>(artifactArray: T[], serviceArtifact: T) {
    return artifactArray?.some(entity => entity.id === serviceArtifact.id) || false
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

  private convertUserArtifactEntityToUserArtifact(userArtifactEntity: UserArtifactEntity): IUserArtifact {
    // Combine artifact and id column together into one object
    return {
      ...userArtifactEntity.artifact, 
      id: this.parseUserArtifactId(userArtifactEntity.id)
    }
  }
}