import { Entity, PrimaryColumn } from 'typeorm'
import { Audit } from '../../common/entity/audit.entity.ts'

@Entity()
export class UserArtifactGroup extends Audit {
  @PrimaryColumn({ name: 'user_id' })
  userId: string
}
