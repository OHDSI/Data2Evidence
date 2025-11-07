import { Service } from "typedi";
import { Repository } from "typeorm";
import dataSource from "../../common/data-source/data-source";
import { BlobData } from "../entity/blob-data.entity";

@Service()
export class BlobDataRepository extends Repository<BlobData> {
  constructor() {
    super(BlobData, dataSource.createEntityManager());
  }
}
