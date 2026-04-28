import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from "typeorm";

import { Audit } from "./audit.ts";
import { type IReactFlow } from "../types.ts";
import { Canvas } from "./canvas.ts";

@Entity("Graph")
export class Graph extends Audit {
  @PrimaryColumn({ type: "uuid" })
  id: string;

  @Column({ name: "flow", type: "jsonb" })
  flow: IReactFlow;

  @Column({ nullable: true })
  comment: string;

  @Column({ name: "canvas_id", type: "uuid" })
  canvasId: string;

  @ManyToOne(() => Canvas, (canvas) => canvas.revisions, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "canvas_id" })
  canvas;

  @Column({ name: "version", type: "int", nullable: false })
  version: number;
}
