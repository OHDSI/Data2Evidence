import { Inject, Injectable } from '@danet/core'
import { EntityManager, Repository } from 'npm:typeorm'
import { DATABASE } from '../../database/module.ts'
import { PostgresService } from '../../database/postgres.service.ts'
import { IDatasetAttribute, IDatasetAttributeDto } from '../../types.d.ts'
import { DatasetAttribute } from '../entity/index.ts'

@Injectable()
export class DatasetAttributeRepository extends Repository<DatasetAttribute> {
  constructor(@Inject(DATABASE) postgresService: PostgresService) {
    const dataSource = postgresService.getDataSource();
    if (!dataSource || !dataSource.manager) {
      throw new Error('DataSource or DataSource.manager is undefined');
    }
    super(DatasetAttribute, dataSource.manager);
  }

  async getAttributeDto(datasetId: string, trxMgr: EntityManager | undefined = undefined) {
    const entities = await this.createQueryBuilder('attribute', trxMgr?.queryRunner)
      .where('attribute.datasetId = :datasetId', { datasetId })
      .getMany()

    return entities.reduce<IDatasetAttributeDto[]>((acc, entity) => {
      acc.push({
        attributeId: entity.attributeId,
        studyId: entity.datasetId,
        value: entity.value
      })
      return acc
    }, [])
  }

  async getDatasetAttribute(datasetId: string, attributeId: string) {
    return await this.createQueryBuilder('attribute')
      .where('attribute.datasetId = :datasetId', { datasetId })
      .andWhere('attribute.attributeId = :attributeId', { attributeId })
      .getOne()
  }

  async insertAttribute(trxMgr: EntityManager, entity: Partial<DatasetAttribute>) {
    const result = await trxMgr.insert(DatasetAttribute, entity)
    return {
      id: result.identifiers[0].id
    }
  }

  async deleteAttribute(trxMgr: EntityManager, criteria: Partial<DatasetAttribute>) {
    return await trxMgr.delete(DatasetAttribute, criteria)
  }

  createAttribute(datasetId, attribute: IDatasetAttribute) {
    const entity: Partial<DatasetAttribute> = { datasetId, attributeId: attribute.attributeId, value: attribute.value }
    return entity
  }
}
