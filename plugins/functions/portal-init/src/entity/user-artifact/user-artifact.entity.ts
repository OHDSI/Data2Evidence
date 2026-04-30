import { Column, Entity, PrimaryColumn } from 'typeorm';
import { Audit } from "../../common/entity/audit.entity.ts";
import { ServiceName } from "../enums/index.ts";
import type {
  IBookmarkArtifact,
  IAtlasCohortDefinitionArtifact,
  IConceptSetArtifact,
  INotebookArtifact,
  IAnalysisFlowArtifact,
} from "../../../../_shared/user-artifacts/types.ts";

type IUserArtifactColumn =
  | IBookmarkArtifact
  | IAtlasCohortDefinitionArtifact
  | IConceptSetArtifact
  | INotebookArtifact
  | IAnalysisFlowArtifact;

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
