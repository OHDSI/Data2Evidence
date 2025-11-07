export type DatabaseDialects = 'postgresql' | 'hana'

export enum DomainRequirement {
    CONDITION_OCCURRENCE = 'conditionOccurrence',
    DEATH = 'death',
    PROCEDURE_OCCURRENCE = 'procedureOccurrence',
    DRUG_EXPOSURE = 'drugExposure',
    OBSERVATION = 'observation',
    MEASUREMENT = 'measurement',
    DEVICE_EXPOSURE = 'deviceExposure'
  }

export class FilterQueryBuilder {
  private readonly domainAnalysisIds: { [domain: string]: number } = {
    [DomainRequirement.CONDITION_OCCURRENCE]: 400,
    [DomainRequirement.DEATH]: 500,
    [DomainRequirement.PROCEDURE_OCCURRENCE]: 600,
    [DomainRequirement.DRUG_EXPOSURE]: 700,
    [DomainRequirement.OBSERVATION]: 800,
    [DomainRequirement.MEASUREMENT]: 1800,
    [DomainRequirement.DEVICE_EXPOSURE]: 2100
  }
  private queryArr: string[] = []
  private dialect: string
  private schemas: string[]
  private filterParams

  constructor(dialect: DatabaseDialects, schemas: string[], filterParams) {
    this.dialect = dialect
    this.schemas = schemas
    this.filterParams = filterParams
  }

  private selectSchema(schema) {
    this.queryArr.push(`SELECT '${schema}' AS "schema_name",`)
  }

  private addTotalSubjectsCol(schema: string) {
    this.queryArr.push(`(SELECT ar.count_value FROM ${schema}.achilles_results ar
      WHERE ar.analysis_id = 1
      ) AS "total_subjects",`)
  }

  private addComma() {
    this.queryArr.push(',')
  }

  private fromDummy() {
    this.queryArr.push('FROM DUMMY')
  }

  private union() {
    this.queryArr.push('UNION ALL')
  }

  private addFilterCol(schema: string, filterKey: string, isLast = false) {
    switch (filterKey) {
      case 'age':
        const ageRange = this.filterParams.age
        this.addAgeCol(schema, ageRange['gte'], ageRange['lte'])
        break
      // observationYear
      case 'obsYr':
        const obsYearRange = this.filterParams.obsYr
        this.addObsYearCol(schema, obsYearRange['gte'], obsYearRange['lte'])
        break
      // minCumulativeObservationMonth
      case 'minObsMth':
        const minCumulativeObsMonth = this.filterParams.minObsMth
        this.addMinCumulativeObsMonthCol(schema, minCumulativeObsMonth)
        break
      case 'domains':
        const domains = this.filterParams.domains
        for (let i = 0; i < domains.length; i++) {
          const domain = domains[i]
          this.addDomainSql(schema, domain)
          if (i !== domains.length - 1) {
            this.addComma()
          }
        }
        break
      default:
        throw new Error(`Invalid filter found: ${filterKey}`) // should be bad request exception
    }
    if (!isLast) {
      this.addComma()
    }
  }

  private addDomainSql(schema: string, domain: string) {
    const analysisId = this.domainAnalysisIds[domain]
    const snakeCaseDomain = domain.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
    this.queryArr.push(`CASE WHEN EXISTS 
    (SELECT ar.stratum_1 FROM ${schema}.achilles_results ar WHERE ar.analysis_id = ${analysisId}
    )
    THEN true
    ELSE false
    END AS "has_${snakeCaseDomain}"`)
  }

  private addAgeCol(schema: string, startAge: number, endAge: number) {
    const currYear = new Date().getFullYear()
    const startYear = currYear - endAge
    const endYear = currYear - startAge
    this.queryArr.push(`CASE WHEN EXISTS 
    (SELECT ar.stratum_1 FROM ${schema}.achilles_results ar WHERE ar.analysis_id = 3
    AND cast(ar.stratum_1 as int) BETWEEN ${startYear} AND ${endYear}
    )
    THEN true
    ELSE false
	END AS "in_age_range"`)
  }

  private addObsYearCol(schema: string, startYear: number, endYear: number) {
    this.queryArr.push(`CASE WHEN EXISTS 
    (SELECT ar.stratum_1 FROM ${schema}.achilles_results ar WHERE ar.analysis_id = 109
    AND cast(ar.stratum_1 as int) BETWEEN ${startYear} AND ${endYear}
    )
    THEN true
    ELSE false
	END AS "in_obs_year_range"`)
  }

  private addMinCumulativeObsMonthCol(schema: string, minMonthCount: number) {
    this.queryArr.push(`CASE WHEN EXISTS 
    (SELECT ar.stratum_1 FROM ${schema}.achilles_results ar WHERE ar.analysis_id = 108
    AND cast(ar.stratum_1 as int) >= ${minMonthCount}
    )
    THEN true
    ELSE false
	END AS "has_min_cumulative_obs_month"`)
  }

  build() {
    const filters = Object.keys(this.filterParams)
    const schemaLength = this.schemas.length
    for (let i = 0; i < schemaLength; i++) {
      const schema = this.schemas[i]
      this.selectSchema(schema)
      this.addTotalSubjectsCol(schema)
      for (let j = 0; j < filters.length; j++) {
        const filter = filters[j]
        this.addFilterCol(schema, filter, j === filters.length - 1)
      }
      if (this.dialect === 'hana') {
        this.fromDummy()
      }
      if (i !== schemaLength - 1) {
        this.union()
      }
    }
    return this.queryArr.join(' ')
  }
}
