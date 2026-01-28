import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "npm:typeorm";
import { Audit } from "../../common/entity/audit.entity.ts";
import { DatasetCode } from "./dataset-code.entity.ts";

@Entity("dataset_code_query")
export class DatasetCodeQuery extends Audit {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "text" })
  sql: string;

  @Column({ name: "dataset_id" })
  datasetId: string;

  @Column()
  type: string;

  @Column()
  name: string;

  @ManyToOne(() => DatasetCode, {
    onDelete: "CASCADE",
  })
  @JoinColumn([
    { name: "dataset_id", referencedColumnName: "datasetId" },
    { name: "type", referencedColumnName: "type" },
    { name: "name", referencedColumnName: "name" },
  ])
  datasetCode: DatasetCode;
}
