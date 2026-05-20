import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'npm:typeorm'
import { Audit } from '../../common/entity/audit.entity.ts'
import { DatasetTagConfig } from './dataset-tag-config.entity.ts'
// import { Dataset } from './dataset.entity.ts'

@Entity('dataset_tag')
@Unique(['datasetId', 'name'])
export class DatasetTag extends Audit {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ nullable: true })
  name: string
  @ManyToOne(() => DatasetTagConfig, tagConfig => tagConfig.name, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'name' })
  tagConfig: DatasetTagConfig

  @Column({ name: 'dataset_id' })
  datasetId: string

  @ManyToOne('Dataset', 'tags', {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'dataset_id' })
  dataset: any
}
