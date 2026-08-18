import { BeforeInsert, Column, Entity, OneToMany, OneToOne, PrimaryColumn } from 'npm:typeorm'
import { Audit } from '../../common/entity/audit.entity.ts'
import { type DatabaseDialect } from '../../types.d.ts'
import { DatasetAttribute, DatasetDashboard, DatasetDetail, DatasetTag } from '../entity/index.ts'

// Convert a UUID into a valid SQL/DuckDB identifier:
//   * hyphens -> underscores
//   * leading digit -> underscore prefix
export function sanitizeIdForCacheId(id: string): string {
  const cleaned = id.replace(/-/g, '_')
  return /^[0-9]/.test(cleaned) ? `_${cleaned}` : cleaned
}

// A dataset row of this type is queried straight against its source database: the cache
// for a `source` dataset is built on its *child* cache dataset (see createDatasetSnapshot),
// never on the source row itself, so the source row must not name a cache catalog.
export const SOURCE_DATASET_TYPE = 'source'

export interface CacheIdInput {
  dialect?: string | null
  type?: string | null
  id?: string | null
  databaseCode?: string | null
}

// Single source of truth for a dataset's default cache_id. Every write path that persists
// or transmits a cache_id must go through this, otherwise the value stored in the DB and
// the value handed to trex /attach can drift.
//
// The two databaseCode branches are deliberately separate — they hold for different
// reasons and neither subsumes the other:
//   * dialect === 'hana'  — HANA is queried directly; no DuckDB cache exists for ANY HANA
//     dataset regardless of type (this is the only branch covering hana + type 'webapi').
//   * type === 'source'   — the source row's cache lives on its child cache dataset, so on
//     any dialect a source row pointing at sanitizeIdForCacheId(id) names a catalog nobody
//     builds. Consumers resolve `cacheId ?? databaseCode`, so a bogus non-null value
//     suppresses the fallback and queries hit a missing catalog. See issue #2877.
export function resolveCacheId(dataset: CacheIdInput): string | null {
  if (dataset.dialect === 'hana') return dataset.databaseCode ?? null
  if (dataset.type === SOURCE_DATASET_TYPE) return dataset.databaseCode ?? null
  if (dataset.id) return sanitizeIdForCacheId(dataset.id)
  return dataset.databaseCode ?? null
}

@Entity('dataset')
export class Dataset extends Audit {
  @PrimaryColumn({ type: 'uuid' })
  id: string

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string

  @Column({ name: 'visibility_status', default: 'HIDDEN' })
  visibilityStatus: string

  @Column({
    name: 'dialect',
    type: 'varchar',
  })
  dialect: DatabaseDialect

  @Column({ name: 'database_code' })
  databaseCode: string

  @Column({ name: 'cache_id', type: 'varchar', nullable: true })
  cacheId: string | null

  @Column({ name: 'schema_name', nullable: true })
  schemaName: string

  @Column({ name: 'vocab_schema_name', nullable: true })
  vocabSchemaName: string

  @Column({ name: 'result_schema_name' })
  resultsSchemaName: string

  @Column({ name: 'flow_parameters', type: 'jsonb', nullable: true })
  flowParameters: Record<string, unknown> | null

  @Column({ name: 'token_dataset_code', unique: true })
  tokenDatasetCode: string

  @Column({ nullable: true })
  type: string

  @Column({ name: 'data_model', nullable: true })
  dataModel: string

  @Column({ name: 'plugin', nullable: true })
  plugin: string

  @Column({ name: 'source_dataset_id', type: 'uuid', nullable: true })
  sourceDatasetId: string

  @Column({ name: 'pa_config_id', type: 'uuid', nullable: true })
  paConfigId: string

  @Column({ name: 'fhir_dataset_id', type: 'uuid', nullable: true })
  fhirDatasetId: string

  @OneToOne(() => DatasetDetail, datasetDetail => datasetDetail.dataset)
  datasetDetail: DatasetDetail

  @OneToMany(() => DatasetAttribute, DatasetAttribute => DatasetAttribute.dataset)
  attributes: DatasetAttribute[]

  @OneToMany(() => DatasetTag, datasetTag => datasetTag.dataset)
  tags: DatasetTag[]

  @OneToMany(() => DatasetDashboard, datasetDashboard => datasetDashboard.dataset)
  dashboards: DatasetDashboard[]

  @BeforeInsert()
  applyCacheIdDefault() {
    if (this.cacheId != null) return
    this.cacheId = resolveCacheId(this)
  }
}
