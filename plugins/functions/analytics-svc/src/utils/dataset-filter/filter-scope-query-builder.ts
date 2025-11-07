import { formatString } from 'typescript-string-operations'
export type DatabaseDialects = 'postgresql' | 'hana'

export class FilterScopeQueryBuilder {
  private queryArr: string[] = []
  private dialect: string
  private schemas: string[]

  constructor(dialect: DatabaseDialects, schemas: string[]) {
    this.dialect = dialect
    this.schemas = schemas
  }

  private union() {
    this.queryArr.push('UNION ALL')
  }

  private addSchemaRangesQuery(schema: string) {
    this.queryArr.push(
      formatString(
        `SELECT '{0}' as schema_name, * FROM (
          SELECT MIN(ar.stratum_1) AS min_birth_year, MAX(stratum_1) AS max_birth_year FROM {0}.achilles_results ar 
          where ar.analysis_id = 3) AS age_ranges
          JOIN (
          SELECT MIN(ar.stratum_1) AS min_obs_year, MAX(stratum_1) AS max_obs_year FROM {0}.achilles_results ar 
          where ar.analysis_id = 109) AS obs_year_ranges
          ON 1 = 1
          JOIN (
          SELECT MIN(ar.stratum_1) AS min_cumulative_obs_months, MAX(stratum_1) AS max_cumulative_obs_months FROM {0}.achilles_results ar 
          where ar.analysis_id = 108) AS cumulative_obs_month_ranges
          ON 1 = 1`,
        schema
      )
    )
  }

  private getCurrentYear() {
    switch (this.dialect) {
      case 'hana':
        return 'YEAR(CURRENT_DATE)'
      case 'postgresql':
        return "CAST(to_char(now(),'YYYY') AS INT)"
      default:
        throw new Error(`Invalid dialect found: "${this.dialect}"`) // should be internal server error
    }
  }

  private generateQuery(unionQuery: string) {
    const currentYear = this.getCurrentYear()
    return formatString(
      `SELECT {0} - CAST(MAX(max_birth_year) AS INT) AS min_age, {0} - CAST(MIN(min_birth_year) AS INT) AS max_age, 
      CAST(MIN(min_obs_year) AS INT) AS min_obs_year, CAST(MAX(max_obs_year) AS INT) AS max_obs_year,
      CAST(MIN(min_cumulative_obs_months) AS INT) AS min_cumulative_obs_months, CAST(MAX(max_cumulative_obs_months) AS INT) AS max_cumulative_obs_months
      FROM ( {1} ) ranges`,
      currentYear,
      unionQuery
    )
  }

  build() {
    const schemaLength = this.schemas.length
    for (let i = 0; i < schemaLength; i++) {
      const schema = this.schemas[i]
      this.addSchemaRangesQuery(schema)
      if (i !== schemaLength - 1) {
        this.union()
      }
    }
    const unionQuery = this.queryArr.join(' ')
    return this.generateQuery(unionQuery)
  }
}
