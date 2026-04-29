import { Entity, PrimaryColumn } from 'typeorm'
import { Audit } from '../../common/entity/audit.entity.ts'

@Entity('dataset_tag_config')
export class DatasetTagConfig extends Audit {
  @PrimaryColumn()
  name: string
}
