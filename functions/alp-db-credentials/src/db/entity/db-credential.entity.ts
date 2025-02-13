import { Entity, Column, ManyToOne, PrimaryGeneratedColumn, JoinColumn, Unique, type Relation } from 'typeorm'
import { Database } from './db.entity'
import { Audit } from '../../common/entity'

@Entity()
@Unique(['dbId', 'username', 'userScope'])
export class DbCredential extends Audit {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  username: string

  @Column()
  password: string

  @Column()
  salt?: string

  @Column({ name: 'user_scope', default: 'Default' })
  userScope: string // Admin, Read

  @Column({ name: 'service_scope' })
  serviceScope: string

  @Column({ name: 'db_id' })
  dbId: string

  @ManyToOne(() => Database, db => db, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'db_id' })
  db: Relation<Database>
}
