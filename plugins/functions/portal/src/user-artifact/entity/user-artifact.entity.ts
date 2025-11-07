import { Column, Entity, PrimaryColumn } from "npm:typeorm";
import z from "zod";
import { Audit } from "../../common/entity/audit.entity.ts";
import { ServiceName } from "../enums/index.ts";
import {
  BookmarkArtifact,
  AtlasCohortDefinitionArtifact,
  ConceptSetArtifact,
  NotebookArtifact,
  AnalysisFlowArtifact,
} from "../../../../_shared/user-artifacts/types.ts";

// Remove id key from artifact objects
// prettier-ignore
const UserArtifactColumn = BookmarkArtifact.omit({id: true})
  .or(AtlasCohortDefinitionArtifact.omit({id: true}))
  .or(ConceptSetArtifact.omit({id: true}))
  .or(NotebookArtifact.omit({id: true}))
  .or(AnalysisFlowArtifact.omit({id: true}));
type IUserArtifactColumn = z.infer<typeof UserArtifactColumn>;

@Entity()
export class UserArtifact extends Audit {
  @PrimaryColumn({ name: "id" })
  id: string;

  @PrimaryColumn({
    name: "service_name",
    type: "enum",
    enum: ServiceName,
  })
  serviceName: ServiceName;

  @Column({ name: "user_id" })
  userId: string;

  @Column("jsonb")
  artifact: IUserArtifactColumn;
}
