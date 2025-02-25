import { _buildCSV, _getCSVHeaders } from '../createZip'

const prepareInput = (value: any) => {
  return {
    headers: ['patient.attributes.status'],
    result: [
      {
        'patient.attributes.status': value,
        'patient.attributes.pid': '1',
      },
    ],
    noValue: 'NoValue',
  }
}

const prepareExpected = value => {
  return `patient.attributes.status,patient.attributes.pid\r\n${value},1\r\n`
}

describe('_getCSVHeaders', () => {
  it('should collect correct ids based on path', () => {
    expect(_getCSVHeaders([], '')).toEqual([])
    expect(_getCSVHeaders([{ id: '1', configPath: 'path1' }], 'path1')).toEqual(['1'])
    expect(
      _getCSVHeaders(
        [
          { id: '1', configPath: 'path1' },
          { id: '2', configPath: 'path2' },
          { id: '3', configPath: 'path1' },
        ],
        'path1'
      )
    ).toEqual(['1', '3'])
  })
})

describe('_buildCSV', () => {
  it('should handle simple text correctly', () => {
    const input = prepareInput('status1')
    const expected = prepareExpected(`status1`)
    expect(_buildCSV(input)).toEqual(expected)
  })

  it('should handle commas in text correctly', () => {
    const input = prepareInput('status1,status2+status3')
    const expected = prepareExpected(`"status1,status2+status3"`)
    expect(_buildCSV(input)).toEqual(expected)
  })

  it('should handle double quotes in text correctly', () => {
    const input = prepareInput('"status1"')
    const expected = prepareExpected(`""status1""`)
    expect(_buildCSV(input)).toEqual(expected)
  })

  it('should handle double quotes with commas in text correctly', () => {
    const input = prepareInput('"status1,status"2+status3"')
    const expected = prepareExpected(`"""status1,status""2+status3"""`)
    expect(_buildCSV(input)).toEqual(expected)
  })

  it('should handle leading zeros in text correctly', () => {
    const input = prepareInput('01')
    const expected = prepareExpected(`01`)
    expect(_buildCSV(input)).toEqual(expected)

    const input1 = prepareInput('01,2')
    const expected1 = prepareExpected(`"01,2"`)
    expect(_buildCSV(input1)).toEqual(expected1)

    // '0 shows as '0 in google sheets, hence no need to prepend ' for 0
    const input2 = prepareInput('0')
    const expected2 = prepareExpected(`0`)
    expect(_buildCSV(input2)).toEqual(expected2)

    const input3 = prepareInput('01a')
    const expected3 = prepareExpected(`01a`)
    expect(_buildCSV(input3)).toEqual(expected3)

    // Prepend of ' for leading 0 urrently does not handle decimals.
    const input4 = prepareInput('0.0')
    const expected4 = prepareExpected(`0.0`)
    expect(_buildCSV(input4)).toEqual(expected4)
    const input5 = prepareInput('0.')
    const expected5 = prepareExpected(`0.`)
    expect(_buildCSV(input5)).toEqual(expected5)
  })
})
