import { Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'

export abstract class Audit {
  @Column({ name: 'created_by' })
  createdBy: string

  @CreateDateColumn({ name: 'created_date', type: 'timestamp' })
  createdDate: Date

  @Column({ name: 'modified_by' })
  modifiedBy: string

  @UpdateDateColumn({ name: 'modified_date', type: 'timestamp' })
  modifiedDate: Date
}
