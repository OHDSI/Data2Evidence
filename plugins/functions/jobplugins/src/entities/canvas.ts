import { Column, Entity, OneToMany, PrimaryColumn } from "typeorm";

import { Audit } from "./audit.ts";
import { Graph } from "./graph.ts";

@Entity("Canvas")
export class Canvas extends Audit {
  @PrimaryColumn({ type: "uuid" })
  id: string;

  @Column()
  name: string;

  @Column({ name: "last_flow_run_id", type: "uuid", nullable: true })
  lastFlowRunId: string;

  @OneToMany(() => Graph, (revision) => revision.dataflow)
  revisions;

  @Column()
  type: string;
}
