import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  type Relation,
} from "typeorm";
import { BlobData } from "./blob-data.entity";

@Entity({ name: "user_data" })
@Unique(["hash", "username", "dataKey", "fileName"])
export class UserData {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  hash: string;

  @Column()
  username: string;

  @Column({ name: "data_key" })
  dataKey: string;

  @Column({ name: "file_name" })
  fileName: string;

  @Column({ name: "blob_id" })
  blobId: number;

  @ManyToOne(() => BlobData, (blobData) => blobData.userData)
  @JoinColumn({ name: "blob_id" })
  blobData: Relation<BlobData>;
}
