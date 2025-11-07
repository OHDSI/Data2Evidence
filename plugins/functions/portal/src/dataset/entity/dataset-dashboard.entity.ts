import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'npm:typeorm'
import { Audit } from '../../common/entity/audit.entity.ts'
// import { Dataset } from './dataset.entity.ts'

@Entity('dataset_dashboard')
export class DatasetDashboard extends Audit {
  @PrimaryColumn({ type: 'uuid' })
  id: string

  @Column({ unique: true })
  name: string

  @Column()
  url: string

  @Column({ name: 'base_path' })
  basePath: string

  // Required for creation
  @Column({ name: 'dataset_id' })
  datasetId: string

  @ManyToOne('Dataset', 'dashboards', {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'dataset_id' })
  dataset: any
}
