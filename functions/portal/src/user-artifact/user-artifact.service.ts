import { ConflictException, Injectable, NotFoundException, BadRequestException, SCOPE } from '@danet/core'
import { RequestContextService } from '../common/request-context.service.ts'
import { CreateArtifactDto, UpdateArtifactDto } from './dto/index.ts'
import { UserArtifact } from './entity/user-artifact.entity.ts'
import { ServiceName } from './enums/index.ts'
import { UserArtifactRepository } from './repository/user-artifact.repository.ts'

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
  private readonly sharedConditionMap = {
    [ServiceName.NOTEBOOKS]: "isShared",
    [ServiceName.CONCEPT_SETS]: "shared"
  }

  async getUserServiceArtifact(userId: string, serviceName: ServiceName): Promise<any> {
    const artifact = await this.userArtifactRepository.findOne(userId, serviceName)
    const result = artifact?.artifacts
    if (!result) {
      throw new NotFoundException(`Artifact for userId ${userId} not found in ${serviceName}`)
    }
    return result
  }

  async getUserServiceArtifactById(userId: string, serviceName: ServiceName, id: string): Promise<any> {
    const artifact = await this.userArtifactRepository.findOne(userId, serviceName)
    const result = artifact?.artifacts?.find(art => art.id === this.parseUserArtifactId(id))
    if (!result) {
      throw new NotFoundException(`Artifact with id ${id} not found in ${serviceName}`)
    }
    return result
  }

  async getServiceArtifactById(serviceName: ServiceName, id: string): Promise<UserArtifact[]> {
    const parsedId = this.parseUserArtifactId(id);

    const userArtifact = await this.userArtifactRepository.findByServiceArtifactId(serviceName, parsedId);

    for (const artifact of userArtifact.artifacts) {
      if (artifact.id === parsedId) {
        return [artifact];
      }
    }

    throw new NotFoundException(`Artifact with id ${id} not found in ${serviceName}`);
  }

  async createServiceArtifact<T>(serviceName: ServiceName, createArtifactDto: CreateArtifactDto<T>): Promise<UserArtifact | null> {
    const { serviceArtifact } = createArtifactDto

    let artifact = await this.userArtifactRepository.findOne(this.userId, serviceName)

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
  ): Promise<UserArtifact> {
    const { id, serviceArtifact } = updateArtifactDto
    const artifact = await this.userArtifactRepository.findOne(this.userId, serviceName)

    if (artifact?.artifacts) {
      const index = artifact.artifacts.findIndex(item => item.id === this.parseUserArtifactId(id))
      if (index === -1) {
        throw new NotFoundException(`Artifact with id ${id} not found in ${serviceName}`)
      }

      artifact.artifacts[index] = {
        ...artifact.artifacts[index],
        ...serviceArtifact
      }
      const updatedEntity = this.addOwner(artifact)
      return this.userArtifactRepository.save(updatedEntity)
    }

    throw new NotFoundException(`Service ${serviceName} not found for user ${updateArtifactDto.userId}`)
  }

  async updateServiceArtifactEntity(serviceName: ServiceName, updatedEntity: Record<string, any>): Promise<UserArtifact> {
    const userArtifacts = await this.userArtifactRepository.find(serviceName)

    if (!userArtifacts || userArtifacts.length === 0) {
      throw new NotFoundException('No user artifacts found')
    }

    for (const userArtifact of userArtifacts) {
      const artifacts = userArtifact.artifacts

      if (artifacts) {
        const artifactIndex = artifacts.findIndex(artifact => artifact.id === updatedEntity.id)

        if (artifactIndex !== -1) {
          const updatedProps = updatedEntity.serviceArtifact;

          artifacts[artifactIndex] = {
            ...artifacts[artifactIndex],
            ...updatedProps
          };

          console.log('Updated artifact:', JSON.stringify(artifacts[artifactIndex], null, 2));

          userArtifact.artifacts = artifacts;

          // TODO: Only return artifact that was updated, instead of all artifacts
          const savedArtifact = await this.userArtifactRepository.save(userArtifact)

          return savedArtifact
        }
      }
    }

    throw new NotFoundException('Service artifact not found');
  }

  async getAllServiceArtifacts(serviceName: ServiceName): Promise<any[]> {
    return await this.userArtifactRepository.getAllServiceArtifacts(serviceName)
  }

  async getAllUserServiceArtifacts(serviceName: ServiceName, userId: string): Promise<any[]> {
    const userArtifacts = await this.userArtifactRepository.findOne(userId, serviceName)
    const sharedArtifacts = await this.getAllSharedServiceArtifacts(serviceName, userId)


    const userArtifactsList = userArtifacts?.artifacts || []
    return [...userArtifactsList, ...sharedArtifacts]
  }

  async deleteUserServiceArtifact(userId: string, serviceName: ServiceName, id: string): Promise<void> {
    const artifact = await this.userArtifactRepository.findOne(userId, serviceName)

    if (artifact?.artifacts) {
      artifact.artifacts = artifact.artifacts.filter(
        item => item.id !== this.parseUserArtifactId(id))
      await this.userArtifactRepository.update(artifact)
    } else {
      throw new NotFoundException(`Artifact with id ${id} for user ${userId} not found in ${serviceName}`)
    }
  }

  async deleteServiceArtifactEntity(serviceName: ServiceName, entityId: string): Promise<UserArtifact | null> {
    const userArtifacts = await this.userArtifactRepository.find(serviceName);

    if (!userArtifacts || userArtifacts.length === 0) {
      throw new NotFoundException('No user artifacts found');
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

    throw new NotFoundException('Service artifact not found');
  }

  async getServiceArtifactSequenceNextval(
    serviceName: ServiceName
  ): Promise<number> {

    if (!Object.keys(ArtifactSequenceMapping).includes(serviceName)) {
      throw new BadRequestException(
        `Service name:${serviceName} does not have a sequence`
      );
    }

    return this.userArtifactRepository.getUserArtifactSequenceNextval(serviceName);
  }

  private async getAllSharedServiceArtifacts(serviceName: ServiceName, userId: string): Promise<any[]> {
    const sharedArtifacts = await this.userArtifactRepository.findSharedArtifacts(userId, serviceName)

    if (!sharedArtifacts.length) {
      return []
    }

    const sharedConditionKey = this.sharedConditionMap[serviceName]
    return sharedArtifacts
      .flatMap(artifact => artifact.artifacts || [])
      .filter(artifact => artifact[sharedConditionKey] === true)
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

  private parseUserArtifactId(id: string): number | string {
    // Try to parse id as number.
    // This is required because concept_sets and atlas_cohort_definitions ids are stored as int, but other artifact ids are stored as UUID.
    return Number.isNaN(Number(id)) ? id : Number(id);
  }
}