import { postProcessConvertPatientListToCsv } from '../postProcessConvertPatientListToCsv'

const NOVALUE = 'NoValue'

describe('--- TESTS SUITE FOR CSV DOWNLOAD REQUEST PROCESSOR ---', () => {
  describe('convertToCsv() ', () => {
    const separator = ','
    const mockResult = {
      measures: [
        { name: 'Column1', id: 'a' },
        { name: 'SomeOtherColumn', id: 'b' },
        { name: 'COLUMN!', id: 'c' },
      ],
      data: [
        { a: 1, b: 'a', c: 3 },
        { a: 4, b: 'b', c: 6 },
        { a: 7, b: 'c', c: 9 },
      ],
      categories: [],
    }

    it(" adds the headers in the 'measures' field of the input to the first line", () => {
      const output = postProcessConvertPatientListToCsv({ result: mockResult, NOVALUE })

      const firstLine = output.split('\r\n')[0]
      const splitOutput = firstLine.split(separator)
      expect(splitOutput).toEqual(['Column1', 'SomeOtherColumn', 'COLUMN!'])
    })

    it(' adds all data in the corresponding rows', () => {
      const output = postProcessConvertPatientListToCsv({ result: mockResult, NOVALUE })

      const lines = output.split('\r\n')
      const lineSplits = []
      for (let i = 1; i < lines.length - 1; i++) {
        lineSplits.push(lines[i].split(separator))
      }
      expect(lineSplits).toEqual([
        ['1', 'a', '3'],
        ['4', 'b', '6'],
        ['7', 'c', '9'],
      ])
    })

    it(" uses ';' as a delimiter if no second argument is given", () => {
      const output = postProcessConvertPatientListToCsv({ result: mockResult, NOVALUE })

      const firstLine = output.split('\r\n')[0]
      expect(firstLine).toBe('Column1,SomeOtherColumn,COLUMN!')
    })

    it(' column ordering should follow the order argument', () => {
      const columnOrderList = ['b', 'c', 'a']
      const output = postProcessConvertPatientListToCsv({
        result: mockResult,
        delimiter: separator,
        columnOrderList,
        NOVALUE,
      })
      const columnHeaderLine = output.split('\r\n')[0].split(separator)

      expect(columnHeaderLine[0]).toBe(mockResult.measures[1].name)
      expect(columnHeaderLine[1]).toBe(mockResult.measures[2].name)
      expect(columnHeaderLine[2]).toBe(mockResult.measures[0].name)
    })

    it('column names in the result are compared correctly with the column ordering from UI', () => {
      const columns = [
        'patient.conditions.acme.interactions.Primary_Tumor_Diagnosis_51746faf_b248_4e8b_a03c_2bb79186616a.1.attributes.start',
        '4_Horsemen',
        'patient.conditions.acme.interactions.chemo.1.attributes.chemo_ops',
        'column.1.2.3.5.attributes.confusing_column',
      ]

      const uiColumnOrderList = [
        'patient.conditions.acme.interactions.Primary_Tumor_Diagnosis_51746faf_b248_4e8b_a03c_2bb79186616a.1.attributes.start',
        '4_Horsemen',
        'patient.conditions.acme.interactions.chemo.1.attributes.chemo_ops',
        'column.1.2.3.5.attributes.confusing_column',
      ]
      const mockResultWithSpecialColumns = {
        measures: [
          { name: 'InteractionStart', id: columns[0] },
          { name: 'Horse', id: columns[1] },
          { name: 'ChemoOps', id: columns[2] },
          { name: 'Confusing_column', id: columns[3] },
        ],
        data: [
          {
            [columns[0]]: 1,
            [columns[1]]: 'a',
            [columns[2]]: 3,
            [columns[3]]: 'hey1\\n',
          },
          {
            [columns[0]]: 1,
            [columns[1]]: 'a',
            [columns[2]]: 3,
            [columns[3]]: 'hey2\\r',
          },
          {
            [columns[0]]: 1,
            [columns[1]]: 'a',
            [columns[2]]: 3,
            [columns[3]]: 'hey3\\r\\n',
          },
          {
            [columns[0]]: 1,
            [columns[1]]: 'a',
            [columns[2]]: 3,
            [columns[3]]: 'hey4\n',
          },
        ],
        categories: [],
      }

      const output = postProcessConvertPatientListToCsv({
        result: mockResultWithSpecialColumns,
        delimiter: separator,
        columnOrderList: uiColumnOrderList,
        NOVALUE,
      })
      const columnHeaderLine = output.split('\r\n')[0].split(separator)

      expect(columnHeaderLine[0]).toBe(mockResultWithSpecialColumns.measures[0].name)
      expect(columnHeaderLine[1]).toBe(mockResultWithSpecialColumns.measures[1].name)
      expect(columnHeaderLine[2]).toBe(mockResultWithSpecialColumns.measures[2].name)
      expect(columnHeaderLine[3]).toBe(mockResultWithSpecialColumns.measures[3].name)
      expect(output).toContain('hey1\n')
      expect(output).toContain('hey2\r')
      expect(output).toContain('hey3\r\n')
      expect(output).toContain('hey4\n')
    })

    it('NoValue should be replaced with an empty string', () => {
      const columns = [
        'patient.conditions.acme.interactions.Primary_Tumor_Diagnosis_51746faf_b248_4e8b_a03c_2bb79186616a.1.attributes.start',
        '4_Horsemen',
        'patient.conditions.acme.interactions.chemo.1.attributes.chemo_ops',
        'column.1.2.3.5.attributes.confusing_column',
      ]

      const uiColumnOrderList = [
        'patient.conditions.acme.interactions.Primary_Tumor_Diagnosis_51746faf_b248_4e8b_a03c_2bb79186616a.1.attributes.start',
        '4_Horsemen',
        'patient.conditions.acme.interactions.chemo.1.attributes.chemo_ops',
        'column.1.2.3.5.attributes.confusing_column',
      ]
      const mockResultWithSpecialColumns = {
        measures: [
          { name: 'InteractionStart', id: columns[0] },
          { name: 'Horse', id: columns[1] },
          { name: 'ChemoOps', id: columns[2] },
          { name: 'Confusing_column', id: columns[3] },
        ],
        data: [
          {
            [columns[0]]: [NOVALUE], // to test if it also works with array
            [columns[1]]: NOVALUE,
            [columns[2]]: NOVALUE,
            [columns[3]]: ['hey'],
          },
        ],
        categories: [],
      }

      const output = postProcessConvertPatientListToCsv({
        result: mockResultWithSpecialColumns,
        delimiter: separator,
        columnOrderList: uiColumnOrderList,
        NOVALUE,
      })
      const parsedOutput = output.split('\r\n')[1].split(separator)
      expect(parsedOutput[0]).toBe('')
      expect(parsedOutput[1]).toBe('')
      expect(parsedOutput[2]).toBe('')
      expect(parsedOutput[3]).toBe('hey')
    })
  })
})
