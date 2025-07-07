import { Column, Entity, PrimaryColumn } from 'npm:typeorm'
import { Audit } from '../../common/entity/audit.entity.ts'
import { ServiceName } from '../enums/index.ts'

@Entity()
export class UserArtifact extends Audit {
  @PrimaryColumn({ name: 'user_id' })
  userId: string

  @PrimaryColumn({
    name: "service_name",
    type: "enum",
    enum: ServiceName,
  })
  serviceName: ServiceName;

  // TODO: ADD Types for each user artifact
  @Column('jsonb')
  artifacts: any[]
}
