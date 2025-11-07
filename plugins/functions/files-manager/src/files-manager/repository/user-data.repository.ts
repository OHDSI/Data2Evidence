import { Service } from "typedi";
import { Repository } from "typeorm";
import dataSource from "../../common/data-source/data-source";
import { UserData } from "../entity/user-data.entity";

@Service()
export class UserDataRepository extends Repository<UserData> {
  constructor() {
    super(UserData, dataSource.createEntityManager());
  }
}
