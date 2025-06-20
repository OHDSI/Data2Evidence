import { DataSource } from "npm:typeorm";
import { Seeder } from "./seeder.ts";
import { Config } from "../../../config/entity/index.ts";
import { IConfig } from "../../../types.d.ts";
import { ConfigTypes } from "../../const.ts";

const DEFAULT_VALUES: IConfig[] = [
  {
    type: ConfigTypes.OVERVIEW_DESCRIPTION,
    value:
      "Our vision is a world where health data is comprehensively, digitally, and securely available for research and directly impacts the prevention, diagnosis, and treatment of diseases.",
  },
  {
    type: ConfigTypes.HYBRID_SEARCH,
    value: `{"isEnabled":false,"semanticRatio":"0"}`,
  },
];

export default class ConfigSeeder implements Seeder {
  public async run(dataSource: DataSource): Promise<void> {
    const repository = dataSource.getRepository(Config);

    const result = await repository.createQueryBuilder("config").getMany();
    const entities: Config[] = [];
    for (const config of DEFAULT_VALUES) {
      if (!result.some((x: Config) => x.type === config.type)) {
        entities.push(
          repository.create({
            type: config.type,
            value: config.value,
            createdBy: "system",
            modifiedBy: "system",
          })
        );
      }
    }

    await repository.save(entities);
  }
}
