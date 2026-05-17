import { Inject, Service } from 'typedi'
import { CONTAINER_KEY } from '../const'

export interface GatedDatasetRow {
  datasetId: string
  tenantId: string
  studyGroupId: string
  slug: string
  version: string
}

@Service()
export class PhysionetDatasetQuery {
  constructor(@Inject(CONTAINER_KEY.DB_CONNECTION) private readonly db: any) {}

  // Enumerates all datasets that have a non-empty physionet_version attribute,
  // joined to their STUDY_RESEARCHER b2c_group. physionet_slug falls back to
  // token_dataset_code when not explicitly set.
  async listGated(): Promise<GatedDatasetRow[]> {
    const result = await this.db.raw(`
      SELECT
        d.id              AS dataset_id,
        d.tenant_id       AS tenant_id,
        bg.id             AS study_group_id,
        COALESCE(NULLIF(att_slug.value, ''), d.token_dataset_code) AS slug,
        att_ver.value     AS version
      FROM portal.dataset d
      JOIN portal.dataset_attribute att_ver
        ON att_ver.dataset_id = d.id AND att_ver.attribute_id = 'physionet_version'
      LEFT JOIN portal.dataset_attribute att_slug
        ON att_slug.dataset_id = d.id AND att_slug.attribute_id = 'physionet_slug'
      JOIN usermgmt.b2c_group bg
        ON bg.study_id = d.id AND bg.role = 'RESEARCHER'
      WHERE att_ver.value IS NOT NULL AND att_ver.value <> ''
    `)
    const rows = result?.rows ?? result
    return rows.map((r: any) => ({
      datasetId: r.dataset_id,
      tenantId: r.tenant_id,
      studyGroupId: r.study_group_id,
      slug: r.slug,
      version: r.version,
    }))
  }
}
