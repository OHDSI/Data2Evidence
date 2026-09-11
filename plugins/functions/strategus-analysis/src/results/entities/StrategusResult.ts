import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("results")
export default class StrategusResult {
  @PrimaryColumn({ type: "uuid" })
  id: string;

  @Column({ name: "name", type: "varchar" })
  name: string;

  @Column({ name: "file_name", type: "varchar" })
  fileName: string;

  // pg returns bigint as a string; the transformer keeps fileSize a number on
  // the way out so Content-Length and JSON responses stay numeric.
  @Column({
    name: "file_size",
    type: "bigint",
    transformer: {
      to: (value: number) => value,
      from: (value: string) => Number(value),
    },
  })
  fileSize: number;

  @Column({ name: "checksum", type: "varchar" })
  checksum: string;

  @Column({ name: "bucket", type: "varchar" })
  bucket: string;

  @Column({ name: "storage_path", type: "varchar" })
  storagePath: string;

  @Column({ name: "metadata", type: "jsonb", nullable: true })
  metadata: Record<string, unknown> | null;

  @Column({
    name: "created_at",
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP",
  })
  createdAt: Date;

  @Column({
    name: "updated_at",
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP",
  })
  updatedAt: Date;

  @Column({ name: "created_by", type: "varchar", default: "system" })
  createdBy: string;

  @Column({ name: "modified_by", type: "varchar", default: "system" })
  modifiedBy: string;
}
