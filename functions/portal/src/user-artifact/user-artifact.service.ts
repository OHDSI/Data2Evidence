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

  private readonly defaultArtifact = {
    [ServiceName.DATAFLOW]: [],
    [ServiceName.DATAFLOW_REVISION]: [],
    [ServiceName.DATAFLOW_RUN]: [],
    [ServiceName.ANALYSIS_FLOW]: [],
    [ServiceName.ANALYSIS_FLOW_REVISION]: [],
    [ServiceName.ANALYSIS_FLOW_RUN]: [],
    [ServiceName.NOTEBOOKS]: [],
    [ServiceName.PA_CONFIG]: [],
    [ServiceName.CDW_CONFIG]: [],
    [ServiceName.BOOKMARKS]: [],
    [ServiceName.CONCEPT_SETS]: [],
    [ServiceName.ATLAS_COHORT_DEFINITIONS]: []
  }

  private readonly sharedConditionMap = {
    [ServiceName.NOTEBOOKS]: 'isShared'
  }

  async getUserServiceArtifact(userId: string, serviceName: ServiceName | string): Promise<any> {
    const artifact = await this.userArtifactRepository.findOne(userId)
    const result = artifact?.artifacts[serviceName]
    if (!result) {
      throw new NotFoundException(`Artifact for userId ${userId} not found in ${serviceName}`)
    }
    return result
  }

  async getUserServiceArtifactById(userId: string, serviceName: ServiceName, id: string): Promise<any> {
    const artifact = await this.userArtifactRepository.findOne(userId)
    const result = artifact?.artifacts[serviceName]?.find(art => art.id === this.parseUserArtifactId(id))
    if (!result) {
      throw new NotFoundException(`Artifact with id ${id} not found in ${serviceName}`)
    }
    return result
  }

  async getServiceArtifactById(serviceName: string, id: string): Promise<UserArtifact[]> {
    const parsedId = this.parseUserArtifactId(id);

    const userArtifacts = await this.userArtifactRepository.findByServiceArtifactId(serviceName, parsedId);


    for (const artifact of userArtifacts) {
      const matchedEntity = artifact.artifacts[serviceName].find(item => item.id === parsedId);
      if (matchedEntity) {
        return [matchedEntity];
      }
    }

    throw new NotFoundException(`Artifact with id ${id} not found in ${serviceName}`);
  }

  async createServiceArtifact<T>(serviceName: string, createArtifactDto: CreateArtifactDto<T>): Promise<UserArtifact | null> {
    const { serviceArtifact } = createArtifactDto

    let artifact = await this.userArtifactRepository.findOne(this.userId)

    if (artifact) {
      const artifactArray = artifact.artifacts[serviceName]

      if (artifactArray) {
        if (this.isArtifactExists(artifactArray, serviceArtifact)) {
          throw new ConflictException(`Artifact for ${serviceName} already exists`)
        }
        artifactArray.push(serviceArtifact)
      } else {
        artifact.artifacts[serviceName] = [serviceArtifact]
      }
    } else {
      artifact = await this.userArtifactRepository.create(
        this.addOwner(
          {
            userId: this.userId,
            artifacts: {
              ...this.defaultArtifact,
              [serviceName]: [serviceArtifact]
            }
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
    serviceName: ServiceName | string,
    updateArtifactDto: UpdateArtifactDto<T>
  ): Promise<UserArtifact> {
    const { id, serviceArtifact } = updateArtifactDto
    const artifact = await this.userArtifactRepository.findOne(this.userId)

    if (artifact?.artifacts[serviceName]) {
      const index = artifact.artifacts[serviceName].findIndex(item => item.id === this.parseUserArtifactId(id))
      if (index === -1) {
        throw new NotFoundException(`Artifact with id ${id} not found in ${serviceName}`)
      }

      artifact.artifacts[serviceName][index] = {
        ...artifact.artifacts[serviceName][index],
        ...serviceArtifact
      }
      const updatedEntity = this.addOwner(artifact)
      return this.userArtifactRepository.save(updatedEntity)
    }

    throw new NotFoundException(`Service ${serviceName} not found for user ${updateArtifactDto.userId}`)
  }

  async updateServiceArtifactEntity(serviceName: string, updatedEntity: Record<string, any>): Promise<UserArtifact> {
    const userArtifacts = await this.userArtifactRepository.find()

    if (!userArtifacts || userArtifacts.length === 0) {
      throw new NotFoundException('No user artifacts found')
    }

    for (const userArtifact of userArtifacts) {
      const artifacts = userArtifact.artifacts[serviceName]

      if (artifacts) {
        const artifactIndex = artifacts.findIndex(artifact => artifact.id === updatedEntity.id)

        if (artifactIndex !== -1) {
          const updatedProps = updatedEntity.serviceArtifact;

          artifacts[artifactIndex] = {
            ...artifacts[artifactIndex],
            ...updatedProps
          };

          console.log('Updated artifact:', JSON.stringify(artifacts[artifactIndex], null, 2));

          userArtifact.artifacts[serviceName] = artifacts;

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
    const userArtifacts = await this.userArtifactRepository.findOne(userId)
    const sharedArtifacts = await this.getAllSharedServiceArtifacts(serviceName, userId)

    const userArtifactsList = userArtifacts?.artifacts[serviceName] || []
    return [...userArtifactsList, ...sharedArtifacts]
  }

  async deleteUserServiceArtifact(userId: string, serviceName: ServiceName | string, id: string): Promise<void> {
    const artifact = await this.userArtifactRepository.findOne(userId)

    if (artifact?.artifacts[serviceName]) {
      artifact.artifacts[serviceName] = artifact.artifacts[serviceName]
        .filter(item => item.id !== this.parseUserArtifactId(id))
      await this.userArtifactRepository.update(artifact)
    } else {
      throw new NotFoundException(`Artifact with id ${id} for user ${userId} not found in ${serviceName}`)
    }
  }

  async deleteServiceArtifactEntity(serviceName: string, entityId: string): Promise<UserArtifact | null> {
    const userArtifacts = await this.userArtifactRepository.find();

    if (!userArtifacts || userArtifacts.length === 0) {
      throw new NotFoundException('No user artifacts found');
    }

    for (const userArtifact of userArtifacts) {
      const artifacts = userArtifact.artifacts[serviceName];

      if (artifacts) {
        const artifactIndex = artifacts.findIndex(artifact => artifact.id === this.parseUserArtifactId(entityId));

        if (artifactIndex !== -1) {
          artifacts.splice(artifactIndex, 1);
          userArtifact.artifacts[serviceName] = [...artifacts];
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
      .flatMap(artifact => artifact.artifacts[serviceName] || [])
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