import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from "typeorm";
import { UserData } from "./user-data.entity";

@Entity({ name: "blob_data" })
export class BlobData {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "oid" })
  data: Buffer;

  @OneToMany(() => UserData, (userData) => userData.blobData)
  userData: UserData[];
}
