import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "npm:typeorm";
import { Audit } from "../../common/entity/audit.entity.ts";

@Entity("ai_config")
@Index("ai_config_name_idx", ["name"], { unique: true })
@Index("ai_config_active_idx", ["isActive"], {
  unique: true,
  where: '"is_active"',
})
export class AiConfig extends Audit {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  provider: string;

  @Column()
  model: string;

  @Column({ name: "base_url", type: "character varying", nullable: true })
  baseUrl: string | null;

  @Column({ type: "character varying", nullable: true })
  region: string | null;

  @Column({ name: "workspace_id", type: "character varying", nullable: true })
  workspaceId: string | null;

  @Column({ name: "api_key_encrypted", type: "text" })
  apiKeyEncrypted: string;

  @Column({ name: "is_active", default: false })
  isActive: boolean;
}
