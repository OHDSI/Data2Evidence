import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'npm:typeorm'
import { Audit } from '../../common/entity/audit.entity.ts'
// import { Dataset } from './dataset.entity.ts'

@Entity('dataset_detail')
export class DatasetDetail extends Audit {
  @PrimaryColumn({ type: 'uuid' })
  id: string

  @Column({ nullable: true })
  name: string

  @Column({ nullable: true })
  description: string

  @Column({ nullable: true })
  summary: string

  @Column({ name: 'show_request_access', default: false })
  showRequestAccess: boolean

  // Required for creation
  @Column({ name: 'dataset_id' })
  datasetId: string

  @OneToOne('Dataset', 'datasetDetail', {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'dataset_id' })
  dataset: any
}
