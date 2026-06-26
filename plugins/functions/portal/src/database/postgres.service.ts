import { Client } from '@bartlomieju/postgres';
import pg from 'npm:pg';
import { Injectable } from '@danet/core';
import { OnAppBootstrap, OnAppClose } from 'jsr:@danet/core/hook';
import { DataSource } from 'npm:typeorm';
import { Config } from '../config/entity/config.entity.ts';
import { DatasetAttributeConfig } from '../dataset/entity/dataset-attribute-config.entity.ts';
import { DatasetAttribute } from '../dataset/entity/dataset-attribute.entity.ts';
import { DatasetDashboard } from '../dataset/entity/dataset-dashboard.entity.ts';
import { DatasetDetail } from '../dataset/entity/dataset-detail.entity.ts';
import { DatasetRelease } from '../dataset/entity/dataset-release.entity.ts';
import { DatasetTagConfig } from '../dataset/entity/dataset-tag-config.entity.ts';
import { DatasetTag } from '../dataset/entity/dataset-tag.entity.ts';
import { Dataset } from '../dataset/entity/dataset.entity.ts';
import { Feature } from '../feature/entity/feature.entity.ts';
import { Notebook } from '../notebook/entity/notebook.entity.ts';
import { UserArtifactGroup } from '../user-artifact/entity/user-artifact-group.entity.ts';
import { UserArtifact } from '../user-artifact/entity/user-artifact.entity.ts';
import { DatasetCode } from '../dataset/entity/dataset-code.entity.ts';
import { DatasetCodeQuery } from '../dataset/entity/dataset-code-query.entity.ts';

const _env = Deno.env.toObject();

let _ssl: boolean | { rejectUnauthorized: boolean; ca: string } = JSON.parse(
  _env.PG__SSL.toLowerCase(),
);
if (_env.PG__CA_ROOT_CERT) {
  _ssl = {
    rejectUnauthorized: true,
    ca: _env.PG__CA_ROOT_CERT,
  };
}

// Module-level singleton DataSource. It must be initialised exactly once and
// before the HTTP server starts serving requests (see index.ts -> initialiseDataSource).
// Otherwise a repository can issue a query before TypeORM has finished building
// entity metadata, which surfaces as `No metadata for "Dataset" was found` and a
// 500 on /system-portal/dataset/public/list.
const dataSource = new DataSource({
  type: 'postgres',
  host: _env.PG_HOST,
  port: parseInt(_env.PG_PORT),
  username: _env.PG_USER,
  password: _env.PG_PASSWORD,
  database: _env.PG__DB_NAME,
  schema: _env.PG_SCHEMA,
  ssl: _ssl,
  entities: [Feature, Config, UserArtifact, UserArtifactGroup, Dataset, DatasetDetail, DatasetTag, DatasetTagConfig, DatasetDashboard, DatasetRelease, DatasetAttribute, DatasetAttributeConfig, Notebook, DatasetCode, DatasetCodeQuery],
});

let _initPromise: Promise<DataSource> | null = null;

// Idempotent: concurrent callers share a single initialize() promise so the
// DataSource is never initialised twice (which can leave entity metadata unbuilt).
export function initialiseDataSource(): Promise<DataSource> {
  if (!_initPromise) {
    _initPromise = dataSource.isInitialized
      ? Promise.resolve(dataSource)
      : dataSource.initialize();
  }
  return _initPromise;
}

@Injectable()
export class PostgresService implements OnAppBootstrap, OnAppClose {
  private _env = Deno.env.toObject();
  public client: Client;
  private dataSource = dataSource;

  constructor() {
    this.client = new Client({
      user: this._env.PG_USER,
      password: this._env.PG_PASSWORD,
      database: this._env.PG__DB_NAME,
      hostname: this._env.PG_HOST,
      schema: this._env.PG_SCHEMA,
      ssl: _ssl
    });
  }

  getDataSource() {
    return this.dataSource;
  }

  async getDataSourceAsync() {
    await initialiseDataSource();
    return this.dataSource;
  }

  async onAppBootstrap() {
    if (!this.client.connected) {
      await this.client.connect();
    }

    // Initialize TypeORM (build entity metadata + connect)
    try {
      await initialiseDataSource();
      console.log('TypeORM DataSource initialized');
    } catch (error) {
      console.error('Database initialization error:', error);
      throw error;
    }
  }

  async onAppClose() {
    if (this.dataSource?.isInitialized) {
      await this.dataSource.destroy();
      // Reset so a re-bootstrap (warm worker reuse) re-initialises the singleton
      // instead of handing back this now-destroyed DataSource.
      _initPromise = null;
    }

    if (this.client?.connected) {
      await this.client.end();
    }
  }
}
