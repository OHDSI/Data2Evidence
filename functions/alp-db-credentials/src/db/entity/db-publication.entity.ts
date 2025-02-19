import { Entity, Column, ManyToOne, PrimaryGeneratedColumn, JoinColumn, Unique, type Relation } from 'typeorm'
import { Database } from './db.entity'
import { Audit } from '../../common/entity'

@Entity()
@Unique(['publication', 'dbId'])
export class DbPublication extends Audit {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  publication: string

  @Column()
  slot: string

  @Column({ name: 'db_id' })
  dbId: string

  @ManyToOne(() => Database, db => db, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'db_id' })
  db: Relation<Database>
}
