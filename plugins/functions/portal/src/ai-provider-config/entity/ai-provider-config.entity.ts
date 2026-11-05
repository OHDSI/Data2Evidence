import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "npm:typeorm";
import { Audit } from "../../common/entity/audit.entity.ts";

// ai_provider_config_unique_idx (host, model, COALESCE(base_url, ''),
// COALESCE(region, ''), COALESCE(workspace_id, '')) is created in the migration.
// It is declared here with synchronize: false so migration:generate does not drop it.
@Entity("ai_provider_config")
@Index("ai_provider_config_unique_idx", { synchronize: false })
@Index("ai_provider_config_selected_idx", ["isSelected"], {
  unique: true,
  where: '"is_selected"',
})
export class AiProviderConfig extends Audit {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  host: string;

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

  @Column({ name: "is_selected", default: false })
  isSelected: boolean;
}
