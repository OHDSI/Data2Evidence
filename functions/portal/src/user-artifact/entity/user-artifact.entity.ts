import { Column, Entity, PrimaryColumn } from 'npm:typeorm'
import { Audit } from '../../common/entity/audit.entity.ts'
import { ServiceName } from '../enums/index.ts'

@Entity()
export class UserArtifact extends Audit {
  @PrimaryColumn({ name: 'user_id' })
  userId: string

  @PrimaryColumn({
    type: "enum",
    enum: ServiceName,
  })
  service_name: ServiceName;

  @Column('jsonb')
  artifacts: Record<ServiceName, any[]>
}
