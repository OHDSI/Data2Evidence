import { Column, Entity, PrimaryColumn } from "typeorm";

import { Audit } from "./audit.ts";

@Entity({ name: "concept_mapping_row_flag" })
export class ConceptMappingRowFlag extends Audit {
  @PrimaryColumn({ name: "dataflow_id" })
  dataflowId: string;

  @PrimaryColumn({ name: "node_id" })
  nodeId: string;

  @PrimaryColumn({ name: "source_row_id" })
  sourceRowId: string;

  @Column({ name: "flagged", type: "boolean", default: false })
  flagged: boolean;
}
