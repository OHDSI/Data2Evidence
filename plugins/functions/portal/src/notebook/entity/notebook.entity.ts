import { Column, Entity, PrimaryColumn } from 'npm:typeorm'
import { Audit } from '../../common/entity/audit.entity.ts'

@Entity('notebook')
export class Notebook extends Audit {
  @PrimaryColumn({ type: 'uuid' })
  id: string

  @Column({ type: 'varchar' })
  name: string

  @Column({ name: 'notebook_content', nullable: true })
  notebookContent: string

  @Column({ name: 'user_id' })
  userId: string

  @Column({ name: 'is_shared' })
  isShared: boolean
}

