import {
  fillMissingValues,
  _getFullValueRange,
  makeBinLabel,
  formatBinningLabels,
  postProcessBarChartData,
} from '../postProcessBarChartData'

const NOVALUE = 'NoValue'

const resultPlaceholderValues = {
  sql: '',
  postProcessingConfig: {
    fillMissingValuesEnabled: true,
    NOVALUE,
    shouldFormatBinningLabels: true,
  },
}

const categoryPlaceholderValues = {
  axis: 1,
  id: '',
  name: '',
  order: '', // "ASC" | "DESC",
  type: '',
  value: '',
}

/* tslint:disable:max-line-length */
const sampleBinnedResult = {
  ...resultPlaceholderValues,
  data: [
    {
      totalpcount: 42895,
      'patient.attributes.pcount': 94,
      'patient.attributes.packYearsSmoked': 0,
    },
    {
      totalpcount: 42895,
      'patient.attributes.pcount': 177,
      'patient.attributes.packYearsSmoked': 20,
    },
    {
      totalpcount: 42895,
      'patient.attributes.pcount': 118,
      'patient.attributes.packYearsSmoked': 40,
    },
    {
      totalpcount: 42895,
      'patient.attributes.pcount': 45,
      'patient.attributes.packYearsSmoked': 60,
    },
    {
      totalpcount: 42895,
      'patient.attributes.pcount': 24,
      'patient.attributes.packYearsSmoked': 80,
    },
    {
      totalpcount: 42895,
      'patient.attributes.pcount': 17,
      'patient.attributes.packYearsSmoked': 100,
    },
    {
      totalpcount: 42895,
      'patient.attributes.pcount': 3,
      'patient.attributes.packYearsSmoked': 120,
    },
    {
      totalpcount: 42895,
      'patient.attributes.pcount': 1,
      'patient.attributes.packYearsSmoked': 140,
    },
    {
      totalpcount: 42895,
      'patient.attributes.pcount': 1,
      'patient.attributes.packYearsSmoked': 180,
    },
    {
      totalpcount: 42895,
      'patient.attributes.pcount': 42415,
      'patient.attributes.packYearsSmoked': 'NoValue',
    },
  ],
  measures: [
    {
      id: 'patient.attributes.pcount',
      value: '{patient.attributes.pcount}',
      name: 'Patient Count',
      group: 1,
      type: 'num',
    },
  ],
  categories: [
    {
      id: 'patient.attributes.packYearsSmoked',
      value: '{patient.attributes.packYearsSmoked}',
      name: 'Pack-Years Smoked',
      type: 'num',
      axis: 1,
      order: 'ASC',
      binsize: 20,
    },
  ],
  totalPatientCount: 42895,
}

const sampleBinnedResultFormatted = {
  ...resultPlaceholderValues,
  data: [
    {
      'patient.attributes.pcount': 42415,
      'patient.attributes.packYearsSmoked': 'NoValue',
    },
    {
      'patient.attributes.pcount': 94,
      'patient.attributes.packYearsSmoked': 0,
    },
    {
      'patient.attributes.pcount': 177,
      'patient.attributes.packYearsSmoked': 20,
    },
    {
      'patient.attributes.pcount': 118,
      'patient.attributes.packYearsSmoked': 40,
    },
    {
      'patient.attributes.pcount': 45,
      'patient.attributes.packYearsSmoked': 60,
    },
    {
      'patient.attributes.pcount': 24,
      'patient.attributes.packYearsSmoked': 80,
    },
    {
      'patient.attributes.pcount': 17,
      'patient.attributes.packYearsSmoked': 100,
    },
    {
      'patient.attributes.pcount': 3,
      'patient.attributes.packYearsSmoked': 120,
    },
    {
      'patient.attributes.pcount': 1,
      'patient.attributes.packYearsSmoked': 140,
    },
    {
      'patient.attributes.pcount': 0,
      'patient.attributes.packYearsSmoked': 160,
    },
    {
      'patient.attributes.pcount': 1,
      'patient.attributes.packYearsSmoked': 180,
    },
  ],
  measures: [
    {
      id: 'patient.attributes.pcount',
      value: '{patient.attributes.pcount}',
      name: 'Patient Count',
      group: 1,
      type: 'num',
    },
  ],
  categories: [
    {
      id: 'patient.attributes.packYearsSmoked',
      value: '{patient.attributes.packYearsSmoked}',
      name: 'Pack-Years Smoked',
      type: 'num',
      axis: 1,
      order: 'ASC',
      binsize: 20,
    },
  ],
  totalPatientCount: 42895,
}

const sampleNonBinnedResult = {
  ...resultPlaceholderValues,
  data: [
    {
      totalpcount: 42895,
      'patient.attributes.pcount': 20986,
      'patient.attributes.gender': 'M',
    },
    {
      totalpcount: 42895,
      'patient.attributes.pcount': 21909,
      'patient.attributes.gender': 'W',
    },
  ],
  measures: [
    {
      id: 'patient.attributes.pcount',
      value: '{patient.attributes.pcount}',
      name: 'Patient Count',
      group: 1,
      type: 'num',
    },
  ],
  categories: [
    {
      id: 'patient.attributes.gender',
      value: '{patient.attributes.gender}',
      name: 'Gender',
      type: 'text',
      axis: 1,
      order: 'ASC',
    },
  ],
  totalPatientCount: 42895,
}

const sampleNonBinnedResultFormatted = {
  ...resultPlaceholderValues,
  data: [
    {
      'patient.attributes.pcount': 20986,
      'patient.attributes.gender': 'M',
    },
    {
      'patient.attributes.pcount': 21909,
      'patient.attributes.gender': 'W',
    },
  ],
  measures: [
    {
      id: 'patient.attributes.pcount',
      value: '{patient.attributes.pcount}',
      name: 'Patient Count',
      group: 1,
      type: 'num',
    },
  ],
  categories: [
    {
      id: 'patient.attributes.gender',
      value: '{patient.attributes.gender}',
      name: 'Gender',
      type: 'text',
      axis: 1,
      order: 'ASC',
    },
  ],
  totalPatientCount: 42895,
}

const sampleTextTypeData = {
  ...resultPlaceholderValues,
  data: [
    {
      totalpcount: 2,
      'patient.attributes.pcount': 2,
      'patient.attributes.yearOfBirth': 1950,
    },
    {
      totalpcount: 2,
      'patient.attributes.pcount': 2,
      'patient.attributes.yearOfBirth': 1940,
    },
  ],
  measures: [
    {
      id: 'patient.attributes.pcount',
      value: '{patient.attributes.pcount}',
      name: 'Patient Count',
      group: 1,
      type: 'num',
    },
  ],
  categories: [
    {
      id: 'patient.attributes.yearOfBirth',
      value: '{patient.attributes.yearOfBirth}',
      name: 'Year of birth',
      type: 'text',
      axis: 1,
      order: 'ASC',
    },
  ],
  totalPatientCount: 2,
  postProcessingConfig: {
    fillMissingValuesEnabled: true,
    NOVALUE: 'NoValue',
    shouldFormatBinningLabels: true,
  },
}

const sampleTextTypeDataFormatted = {
  ...resultPlaceholderValues,
  data: [
    {
      'patient.attributes.pcount': 2,
      'patient.attributes.yearOfBirth': '1940',
    },
    {
      'patient.attributes.pcount': 2,
      'patient.attributes.yearOfBirth': '1950',
    },
  ],
  measures: [
    {
      id: 'patient.attributes.pcount',
      value: '{patient.attributes.pcount}',
      name: 'Patient Count',
      group: 1,
      type: 'num',
    },
  ],
  categories: [
    {
      id: 'patient.attributes.yearOfBirth',
      value: '{patient.attributes.yearOfBirth}',
      name: 'Year of birth',
      type: 'text',
      axis: 1,
      order: 'ASC',
    },
  ],
  totalPatientCount: 2,
  postProcessingConfig: {
    fillMissingValuesEnabled: true,
    NOVALUE: 'NoValue',
    shouldFormatBinningLabels: true,
  },
}

/* tslint:enable:max-line-length */

describe('--- Base Query Engine Endpoint Tests ---', () => {
  it('Fill Missing Values should have the No Values Result in the front (Binned Attributes)', () => {
    const result = fillMissingValues(sampleBinnedResult)
    expect(JSON.stringify(result)).toBe(JSON.stringify(sampleBinnedResultFormatted))
  })
  it('Fill Missing Values should have the No Values Result in the front (Non-Binned Attributes)', () => {
    const result = fillMissingValues(sampleNonBinnedResult)
    expect(JSON.stringify(result)).toBe(JSON.stringify(sampleNonBinnedResultFormatted))
  })
  it('Fill Missing Values should', () => {
    const result = fillMissingValues(sampleTextTypeData)
    expect(JSON.stringify(result)).toBe(JSON.stringify(sampleTextTypeDataFormatted))
  })
  it('Fill Missing Values when nested x-axis (> 1 category) is used should fill values', () => {
    const input = {
      ...resultPlaceholderValues,
      data: [
        // No FEMALE for MO
        {
          totalpcount: 700,
          'patient.attributes.pcount': 11,
          'patient.attributes.Gender': 'MALE',
          'patient.attributes.State': 'MO',
        },
        // No FEMALE for PA
        {
          totalpcount: 700,
          'patient.attributes.pcount': 19,
          'patient.attributes.Gender': 'MALE',
          'patient.attributes.State': 'PA',
        },
        // No MALE for MI
        {
          totalpcount: 700,
          'patient.attributes.pcount': 21,
          'patient.attributes.Gender': 'FEMALE',
          'patient.attributes.State': 'MI',
        },
      ],
      measures: [
        {
          id: 'patient.attributes.pcount',
          value: '{patient.attributes.pcount}',
          name: 'Patient Count',
          group: 1,
          type: 'num',
        },
      ],
      categories: [
        {
          id: 'patient.attributes.Gender',
          value: '{patient.attributes.Gender}',
          name: 'Gender',
          type: 'text',
          axis: 1,
          order: 'ASC',
        },
        {
          id: 'patient.attributes.State',
          value: '{patient.attributes.State}',
          name: 'State',
          type: 'text',
          axis: 1,
          order: 'ASC',
        },
      ],
      totalPatientCount: 700,
    }
    const result = fillMissingValues(input)
    const correctData = {
      ...resultPlaceholderValues,
      categories: [
        {
          id: 'patient.attributes.Gender',
          value: '{patient.attributes.Gender}',
          name: 'Gender',
          type: 'text',
          axis: 1,
          order: 'ASC',
        },
        {
          id: 'patient.attributes.State',
          value: '{patient.attributes.State}',
          name: 'State',
          type: 'text',
          axis: 1,
          order: 'ASC',
        },
      ],
      // Sorted by categories[0], then categories[1]
      data: [
        {
          'patient.attributes.pcount': 21,
          'patient.attributes.State': 'MI',
          'patient.attributes.Gender': 'FEMALE',
        },
        {
          'patient.attributes.pcount': 0,
          'patient.attributes.State': 'MO',
          'patient.attributes.Gender': 'FEMALE',
        },
        {
          'patient.attributes.pcount': 0,
          'patient.attributes.State': 'PA',
          'patient.attributes.Gender': 'FEMALE',
        },
        {
          'patient.attributes.pcount': 0,
          'patient.attributes.State': 'MI',
          'patient.attributes.Gender': 'MALE',
        },
        {
          'patient.attributes.pcount': 11,
          'patient.attributes.State': 'MO',
          'patient.attributes.Gender': 'MALE',
        },
        {
          'patient.attributes.pcount': 19,
          'patient.attributes.State': 'PA',
          'patient.attributes.Gender': 'MALE',
        },
      ],
      measures: [
        {
          id: 'patient.attributes.pcount',
          value: '{patient.attributes.pcount}',
          name: 'Patient Count',
          group: 1,
          type: 'num',
        },
      ],
      totalPatientCount: 700,
    }
    expect(result).toEqual(correctData)
  })
  it('_getFullValueRange() does not remove NoValue, returned list is sorted ASC', () => {
    const data = [{ value: 40 }, { value: 1 }, { value: -70 }, { value: NOVALUE }, { value: 0 }, { value: -10 }]

    const category = {
      axis: 1,
      id: 'value',
      name: 'value',
      order: 'ASC',
      type: 'num',
      value: 'value',
    }

    const result: any[] = _getFullValueRange(data, category, NOVALUE)
    expect(result[0]).toEqual(NOVALUE)
    expect(result[1]).toEqual(-70)
    expect(result[2]).toEqual(-10)
    expect(result[5]).toEqual(40)
  })
  it('makeBinLabel() returns correct labels', () => {
    expect(
      makeBinLabel(
        NOVALUE,
        {
          ...categoryPlaceholderValues,
        },
        NOVALUE
      )
    ).toEqual(NOVALUE)
    expect(
      makeBinLabel(
        'yes',
        {
          ...categoryPlaceholderValues,
        },
        NOVALUE
      )
    ).toEqual('yes')
    expect(makeBinLabel('yes', null, NOVALUE)).toEqual('yes')
    expect(
      makeBinLabel(
        '1',
        {
          ...categoryPlaceholderValues,
          type: 'num',
        },
        NOVALUE
      )
    ).toEqual(1)
    expect(
      makeBinLabel(
        '1',
        {
          ...categoryPlaceholderValues,
          binsize: 10,
          type: 'num',
        },
        NOVALUE
      )
    ).toEqual('1 - 11')
    expect(
      makeBinLabel(
        1,
        {
          ...categoryPlaceholderValues,
          binsize: 9,
          type: 'num',
        },
        NOVALUE
      )
    ).toEqual('1 - 10')
    expect(
      makeBinLabel(
        -1.5,
        {
          ...categoryPlaceholderValues,
          binsize: 0.5,
          type: 'num',
        },
        NOVALUE
      )
    ).toEqual('(-1.5) - (-1)')
  })
})

describe('--- TESTS SUITE FOR REQUEST PROCESSOR UTILITIES ---', () => {
  describe('_getFullValueRange() ', () => {
    const data = [
      {
        pcount: 4,
        age: 10,
        calYear: '2010',
      },
      {
        pcount: 1,
        age: 50,
        calYear: '2010',
      },
      {
        pcount: 2,
        age: 80,
        calYear: '2010',
      },
      {
        pcount: 2,
        age: 30,
        calYear: '2011',
      },
      {
        pcount: 2,
        age: 0,
        calYear: '2012',
      },
    ]

    it('completes the range for numeric categories corresponding to the binsize', () => {
      const category = {
        axis: 1,
        binsize: 10,
        id: 'age',
        name: 'Age at Diagnosis',
        type: 'num',
        value: '{age}',
        order: 'ASC',
      }
      const valueRange = _getFullValueRange(data, category, NOVALUE)
      const expectedResult = [0, 10, 20, 30, 40, 50, 60, 70, 80]
      valueRange.forEach((element, index) => {
        expect(element).toEqual(expectedResult[index])
      })
    })

    it('completes gives all distinct values in the specified order for `text` categories', () => {
      const categoryAsc = {
        axis: 2,
        name: 'Age at Diagnosis',
        id: 'calYear',
        type: 'text',
        order: 'ASC',
        value: '{calYear}',
      }

      const valueRangeAsc = _getFullValueRange(data, categoryAsc, NOVALUE)
      const expectedResult = ['2010', '2011', '2012']
      valueRangeAsc.forEach((element, index) => {
        expect(element).toEqual(expectedResult[index])
      })
    })
  })
})

const binsizeData = {
  ...resultPlaceholderValues,
  data: [
    {
      totalpcount: 4,
      'patient.attributes.pcount': 1,
      'patient.conditions.acme.interactions.priDiag.1.attributes.age': '3e+0',
    },
    {
      totalpcount: 4,
      'patient.attributes.pcount': 1,
      'patient.conditions.acme.interactions.priDiag.1.attributes.age': '4e+0',
    },
    {
      totalpcount: 4,
      'patient.attributes.pcount': 2,
      'patient.conditions.acme.interactions.priDiag.1.attributes.age': '6e+0',
    },
  ],
  measures: [
    {
      id: 'patient.attributes.pcount',
      value: '{patient.attributes.pcount}',
      name: 'Patient Count',
      group: 1,
      type: 'num',
    },
  ],
  categories: [
    {
      id: 'patient.conditions.acme.interactions.priDiag.1.attributes.age',
      value: '{patient.conditions.acme.interactions.priDiag.1.attributes.age}',
      name: 'Age at Diagnosis',
      type: 'num',
      axis: 1,
      order: 'ASC',
      binsize: 1,
    },
  ],
  totalPatientCount: 4,
  postProcessingConfig: {
    fillMissingValuesEnabled: true,
    NOVALUE: 'NoValue',
    shouldFormatBinningLabels: true,
  },
}

const binsizeDataWithFilledMissingData = {
  ...resultPlaceholderValues,
  categories: [
    {
      axis: 1,
      binsize: 1,
      id: 'patient.conditions.acme.interactions.priDiag.1.attributes.age',
      name: 'Age at Diagnosis',
      order: 'ASC',
      type: 'num',
      value: '{patient.conditions.acme.interactions.priDiag.1.attributes.age}',
    },
  ],
  data: [
    {
      'patient.attributes.pcount': 1,
      'patient.conditions.acme.interactions.priDiag.1.attributes.age': '3 - 4',
    },
    {
      'patient.attributes.pcount': 1,
      'patient.conditions.acme.interactions.priDiag.1.attributes.age': '4 - 5',
    },
    {
      'patient.attributes.pcount': 0,
      'patient.conditions.acme.interactions.priDiag.1.attributes.age': '5 - 6',
    },
    {
      'patient.attributes.pcount': 2,
      'patient.conditions.acme.interactions.priDiag.1.attributes.age': '6 - 7',
    },
  ],
  measures: [
    {
      group: 1,
      id: 'patient.attributes.pcount',
      name: 'Patient Count',
      type: 'num',
      value: '{patient.attributes.pcount}',
    },
  ],
  postProcessingConfig: { NOVALUE: 'NoValue', fillMissingValuesEnabled: true, shouldFormatBinningLabels: true },
  totalPatientCount: 4,
}

const binsizeDataWithoutFilledMissingData = {
  ...resultPlaceholderValues,
  categories: [
    {
      axis: 1,
      binsize: 1,
      id: 'patient.conditions.acme.interactions.priDiag.1.attributes.age',
      name: 'Age at Diagnosis',
      order: 'ASC',
      type: 'num',
      value: '{patient.conditions.acme.interactions.priDiag.1.attributes.age}',
    },
  ],
  data: [
    {
      'patient.attributes.pcount': 1,
      'patient.conditions.acme.interactions.priDiag.1.attributes.age': '3 - 4',
      totalpcount: 4,
    },
    {
      'patient.attributes.pcount': 1,
      'patient.conditions.acme.interactions.priDiag.1.attributes.age': '4 - 5',
      totalpcount: 4,
    },
    {
      'patient.attributes.pcount': 2,
      'patient.conditions.acme.interactions.priDiag.1.attributes.age': '6 - 7',
      totalpcount: 4,
    },
  ],
  measures: [
    {
      group: 1,
      id: 'patient.attributes.pcount',
      name: 'Patient Count',
      type: 'num',
      value: '{patient.attributes.pcount}',
    },
  ],
  postProcessingConfig: { NOVALUE: 'NoValue', fillMissingValuesEnabled: false, shouldFormatBinningLabels: true },
  totalPatientCount: 4,
}

const binsizeWithOverlappingValues = {
  categories: [
    {
      axis: 1,
      binsize: 4,
      id: 'patient.conditions.acme.interactions.priDiag.1.attributes.age',
      name: 'Age at Diagnosis',
      order: 'ASC',
      type: 'num',
      value: '{patient.conditions.acme.interactions.priDiag.1.attributes.age}',
    },
  ],
  data: [
    { 'patient.attributes.pcount': 1, 'patient.conditions.acme.interactions.priDiag.1.attributes.age': '0 - 4' },
    { 'patient.attributes.pcount': 3, 'patient.conditions.acme.interactions.priDiag.1.attributes.age': '4 - 8' },
  ],
  measures: [
    {
      group: 1,
      id: 'patient.attributes.pcount',
      name: 'Patient Count',
      type: 'num',
      value: '{patient.attributes.pcount}',
    },
  ],
  postProcessingConfig: { NOVALUE: 'NoValue', fillMissingValuesEnabled: true, shouldFormatBinningLabels: true },
  sql: '',
  totalPatientCount: 4,
}

describe('postProcessBarChartData', () => {
  it('with binning empty bars should be filled in to have a continuous x-axis (fillMissingValuesEnabled=true)', () => {
    expect(postProcessBarChartData(binsizeData)).toEqual(binsizeDataWithFilledMissingData)
  })
  it('with binning empty bars should be filled in to have a continuous x-axis (fillMissingValuesEnabled=false)', () => {
    const binsizeDataCopy = JSON.parse(JSON.stringify(binsizeData))
    binsizeDataCopy.postProcessingConfig.fillMissingValuesEnabled = false
    expect(postProcessBarChartData(binsizeDataCopy)).toEqual(binsizeDataWithoutFilledMissingData)
  })
  it('with binning the resulting x-values should be grouped together according to the `binsize`', () => {
    const binsizeDataCopy = JSON.parse(JSON.stringify(binsizeData))
    binsizeDataCopy.categories[0].binsize = 4
    ;(binsizeDataCopy.data = [
      {
        totalpcount: 4,
        'patient.attributes.pcount': 1,
        'patient.conditions.acme.interactions.priDiag.1.attributes.age': '0e+0',
      },
      {
        totalpcount: 4,
        'patient.attributes.pcount': 3,
        'patient.conditions.acme.interactions.priDiag.1.attributes.age': '4e+0',
      },
    ]),
      expect(postProcessBarChartData(binsizeDataCopy)).toEqual(binsizeWithOverlappingValues)
  })
})
