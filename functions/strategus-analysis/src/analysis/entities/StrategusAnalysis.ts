import {
  Column,
  Entity,
  PrimaryColumn,
} from "typeorm";

@Entity("strategus_analysis")
export default class StrategusAnalysis {

  @PrimaryColumn({ type: "uuid" })
  id: string;

  @Column({ name: "analysis_spec", type: "text" })
  analysisSpec: string;

  @Column({ name: "study_id" })
  studyId: string;

  @Column({ name: "notebook_name" })
  notebookName: string;

  @Column({name: "mode", type: "varchar" })
  mode: string;

  @Column({ name: "created_at", type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date;

  @Column({ name: "updated_at", type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  updatedAt: Date;

  @Column({ name: "created_by", type: "varchar", default: "system" })
  createdBy: string;

  @Column({ name: "modified_by", type: "varchar", default: "system" })
  modifiedBy: string;

}