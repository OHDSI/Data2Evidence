import { Inject, Injectable } from '@danet/core'
import { Repository, DataSource, JsonContains } from 'npm:typeorm'
import { DATABASE } from '../../database/module.ts'
import { PostgresService } from '../../database/postgres.service.ts'
import { UserArtifact } from '../entity/user-artifact.entity.ts'
import { ServiceName } from '../enums/index.ts'
import { ArtifactSequenceMapping } from '../user-artifact.service.ts'

@Injectable()
export class UserArtifactRepository {
  private repository: Repository<UserArtifact> | null = null;
  private dataSource: DataSource | null = null;
  constructor(@Inject(DATABASE) private dbService: PostgresService) {
  }

  private readonly sharedConditionMap = {
    [ServiceName.NOTEBOOKS]: "isShared",
    [ServiceName.CONCEPT_SETS]: "shared",
    [ServiceName.ANALYSIS_FLOW]: undefined,
    [ServiceName.ATLAS_COHORT_DEFINITIONS]: undefined,
    [ServiceName.BOOKMARKS]: "shared",
  }
  
  private async getRepository() {
    if (!this.repository) {
      const dataSource = await this.dbService.getDataSourceAsync();
      this.repository = dataSource.getRepository(UserArtifact);
    }
    return this.repository;
  }
  private async getDatasource() {
    if (!this.dataSource) {
      this.dataSource = await this.dbService.getDataSourceAsync();
    }
    return this.dataSource;
  }

  async findUserServiceArtifactsForService(userId: string, serviceName: ServiceName): Promise<UserArtifact[]> {
    const repository = await this.getRepository()
    return await repository.find({
      where: {
        userId,
        serviceName
      }
    })
  }

    async findUserServiceArtifactByServiceArtifactId(userId: string, serviceName: ServiceName, id: string | number): Promise<UserArtifact> {
    const repository = await this.getRepository()
    return await repository.findOne({
      where: {
        userId,
        serviceName,
        id
      }
    })
  }

  async create(entity: Partial<UserArtifact>): Promise<UserArtifact> {
    const repository = await this.getRepository()
    return await repository.create(entity)
  }

  async update(entity: Partial<UserArtifact>): Promise<UserArtifact | null> {
    const repository = await this.getRepository();

    await repository.update(
      {
        userId: entity.userId,
        serviceName: entity.serviceName
      },
      {
        modifiedBy: entity.modifiedBy,
        artifacts: entity.artifacts,
        modifiedDate: new Date()
      }
    );

    return await repository.findOneBy({ 
      userId: entity.userId,
      serviceName: entity.serviceName
    });
  }

  async save(entity: Partial<UserArtifact>): Promise<UserArtifact> {
    const repository = await this.getRepository()
    return await repository.save(entity)
  }

  async getAllServiceArtifacts(serviceName: ServiceName): Promise<UserArtifact[]> {
    const repository = await this.getRepository()
    return await repository.find({
      where: {
        serviceName
      }
    })
  }

  async findSharedArtifacts(userId: string, serviceName: ServiceName): Promise<UserArtifact[]> {
    const repository = await this.getRepository()
    
    const sharedConditionKey = this.sharedConditionMap[serviceName]
    // If block is required to catch cases where serviceName is not in this.sharedConditionMap as it does not fully implement the ServiceName enum
    if (sharedConditionKey === undefined) {
      const errorMsg = `this.sharedConditionMap does not implement serviceName:${serviceName}`
      console.error(errorMsg)
      throw new Error(errorMsg)
    }

    // TODO: Fix to return only shared artifacts instead of all artifacts from in each serviceName
    return repository
      .createQueryBuilder('userArtifact')
      .where('userArtifact.userId != :userId', { userId })
      .andWhere(`userArtifact.service_name = :serviceName`, { serviceName })
      .andWhere({ artifact: JsonContains({ [sharedConditionKey]: true }) })
      .getMany()
  }

  async findByServiceArtifactId(serviceName: ServiceName, id: string | number): Promise<UserArtifact> {
    const repository = await this.getRepository()
    return repository
      .createQueryBuilder('user_artifact')
      .where(`user_artifact.service_name = :serviceName`, { serviceName })
      .andWhere(`user_artifact.id = :id`, { id })
      .getOne()
  }

  async getUserArtifactSequenceNextval(serviceName: ServiceName): Promise<number> {
    const dataSource = await this.getDatasource();
    const queryRunner = await dataSource.createQueryRunner();
    const result = await queryRunner.manager.query<{ id: number }[]>(
      `SELECT nextval('portal.${ArtifactSequenceMapping[serviceName as keyof typeof ArtifactSequenceMapping]}') as id;`,
    );

    if (result.length !== 1) {
      throw new Error("Error getting concept_set_id_seq sequence nextval");
    }
    return result[0].id;
  }
}