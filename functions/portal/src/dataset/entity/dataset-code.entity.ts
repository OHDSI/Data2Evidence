import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  Unique,
  PrimaryGeneratedColumn,
} from "npm:typeorm";
import { Audit } from "../../common/entity/audit.entity.ts";

@Entity("dataset_code")
@Unique(["datasetId", "type"])
export class DatasetCode extends Audit {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  type: string;

  @Column()
  code: string;

  // Required for creation
  @Column({ name: "dataset_id" })
  datasetId: string;

  @ManyToOne("Dataset", "code", {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "dataset_id" })
  dataset: any;
}
