import { DataSource, DataSourceOptions } from "npm:typeorm";
import { SeederOptions } from "typeorm-extension";
import { Config } from '../../config/entity/config.entity.ts';
import { DatasetAttributeConfig } from '../../dataset/entity/dataset-attribute-config.entity.ts';
import { DatasetAttribute } from '../../dataset/entity/dataset-attribute.entity.ts';
import { DatasetDashboard } from '../../dataset/entity/dataset-dashboard.entity.ts';
import { DatasetDetail } from '../../dataset/entity/dataset-detail.entity.ts';
import { DatasetRelease } from '../../dataset/entity/dataset-release.entity.ts';
import { DatasetTagConfig } from '../../dataset/entity/dataset-tag-config.entity.ts';
import { DatasetTag } from '../../dataset/entity/dataset-tag.entity.ts';
import { Dataset } from '../../dataset/entity/dataset.entity.ts';
import { Feature } from '../../feature/entity/feature.entity.ts';
import { Notebook } from '../../notebook/entity/notebook.entity.ts';
import { UserArtifactGroup } from '../../user-artifact/entity/user-artifact-group.entity.ts';
import { UserArtifact } from '../../user-artifact/entity/user-artifact.entity.ts';
import ConfigSeeder from './seeds/config.seeder.ts';
import DatasetAttributeConfigSeeder from './seeds/dataset-attribute-config.seeder.ts';
import UserArtifactSeeder from './seeds/user-artifact.seeder.ts';
import * as pg from 'npm:pg';

const _env = Deno.env.toObject();

let ssl = JSON.parse(_env.PG__SSL.toLowerCase());
if (_env.PG__CA_ROOT_CERT) {
  ssl = {
    rejectUnauthorized: true,
    ca: _env.PG__CA_ROOT_CERT,
  };
}

export const dataSourceOptions: DataSourceOptions & SeederOptions = {
  type: "postgres",
  host: _env.PG_HOST,
  port: parseInt(_env.PG_PORT),
  username: _env.PG_USER,
  password: _env.PG_PASSWORD,
  database: _env.PG__DB_NAME,
  schema: _env.PG_SCHEMA,
  ssl,
  poolSize: parseInt(_env.PG__MAX_POOL) || 10,
  entities: [Config, DatasetAttributeConfig, DatasetAttribute, DatasetDashboard, DatasetDetail, DatasetRelease, DatasetTagConfig, DatasetTag, Dataset, Feature, Notebook, UserArtifactGroup, UserArtifact],
  seeds: [ConfigSeeder, DatasetAttributeConfigSeeder, UserArtifactSeeder]
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
