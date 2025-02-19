import { Service } from 'typedi'
import { Repository } from 'typeorm'
import dataSource from '../../common/data-source/data-source'
import { DbPublication } from '../entity'

@Service()
export class DbPublicationRepository extends Repository<DbPublication> {
  constructor() {
    super(DbPublication, dataSource.createEntityManager())
  }
}
