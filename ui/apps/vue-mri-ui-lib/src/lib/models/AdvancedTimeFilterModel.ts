export default class AdvancedTimeFilterModel {
  public static createAdvancedTimeFilterModel(timeFilterDataRequest) {
    const timeFilterArray = timeFilterDataRequest.filters
    const timeFilters = []

    for (let i = 0; i < timeFilterArray.length; i += 1) {
      if (timeFilterArray[i].this === 'overlap') {
        timeFilters.push({
          originSelection: timeFilterArray[i].this,
          targetSelection: 'before_startdate',
          targetInteraction: timeFilterArray[i].value,
          days: '',
        })
      } else {
        timeFilters.push({
          originSelection: timeFilterArray[i].this,
          targetSelection: `${timeFilterArray[i].after_before}_${timeFilterArray[i].other}`,
          targetInteraction: timeFilterArray[i].value,
          days: timeFilterArray[i].operator,
        })
      }
    }

    return {
      timeFilterModel: { timeFilters },
      timeFilterTitle: timeFilterDataRequest.title,
    }
  }

  public static getIFR(advancedTimeLayout) {
    const timeFilterData = advancedTimeLayout.props.timeFilterModel.timeFilters
    const timeFilterDataObject = []

    const rangeRegex = /^(\[|\])\s?(0|[1-9][0-9]*)\s?-\s?(0|[1-9][0-9]*)\s?(\[|\])$/g
    const operatorRegex = /^(=|>|<|>=|<=)\s?(0|[1-9][0-9]*)$/g
    const numRegex = /^(0|[1-9][0-9]*)$/g

    for (let i = 0; i < timeFilterData.length; i += 1) {
      const data = timeFilterData[i]
      rangeRegex.lastIndex = 0
      operatorRegex.lastIndex = 0
      numRegex.lastIndex = 0

      if (!data.targetInteraction.length) {
        // do not include TimeFilter when the targetinteraction is empty
        continue
      }

      if (data.originSelection === 'overlap') {
        timeFilterDataObject.push({
          value: data.targetInteraction,
          this: 'overlap',
          other: 'overlap',
          after_before: '',
          operator: '',
        })
      } else {
        if (AdvancedTimeFilterModel.validateText(data.days)) {
          timeFilterDataObject.push({
            value: data.targetInteraction,
            this: data.originSelection,
            other:
              data.targetSelection === 'before_startdate' || data.targetSelection === 'after_startdate'
                ? 'startdate'
                : 'enddate',
            after_before:
              data.targetSelection === 'before_startdate' || data.targetSelection === 'before_enddate'
                ? 'before'
                : 'after',
            operator: data.days,
          })
        }
      }
    }

    return {
      filters: timeFilterDataObject,
      request: AdvancedTimeFilterModel.getRequest(advancedTimeLayout),
      title: advancedTimeLayout.props.timeFilterTitle,
    }
  }

  public static validateText(valu) {
    const rangeRegex = /^(\[|\])\s?(0|[1-9][0-9]*)\s?-\s?(0|[1-9][0-9]*)\s?(\[|\])$/g
    const operatorRegex = /^(=|>|<|>=|<=)\s?(0|[1-9][0-9]*)$/g
    const numRegex = /^(0|[1-9][0-9]*)$/g

    if (!valu || rangeRegex.test(valu) || operatorRegex.test(valu) || numRegex.test(valu)) {
      return true
    }
    return false
  }

  public static getRequest(advancedTimeLayout) {
    const timeFilterData = advancedTimeLayout.props.timeFilterModel.timeFilters
    const timeFilterDataObject = []

    const rangeRegex = /(\[|\])\s?(0|[1-9][0-9]*)\s?-\s?(0|[1-9][0-9]*)\s?(\[|\])/g
    const operatorRegex = /(=|>|<|>=|<=)\s?(0|[1-9][0-9]*)/g
    const numRegex = /(0|[1-9][0-9]*)/g

    for (let i = 0; i < timeFilterData.length; i += 1) {
      const data = timeFilterData[i]
      rangeRegex.lastIndex = 0
      operatorRegex.lastIndex = 0
      numRegex.lastIndex = 0

      if (!data.targetInteraction.length) {
        // do not include TimeFilter when the targetinteraction is empty
        continue
      }
      if (data.originSelection === 'overlap') {
        const thisContainThat = {
          value: data.targetInteraction,
          filter: [
            {
              this: 'startdate',
              other: 'startdate',
              and: [
                {
                  op: '<',
                  value: 0,
                },
              ],
            },
            {
              this: 'enddate',
              other: 'enddate',
              and: [
                {
                  op: '>',
                  value: 0,
                },
              ],
            },
          ],
        }
        const thatContainThis = {
          value: data.targetInteraction,
          filter: [
            {
              this: 'startdate',
              other: 'startdate',
              and: [
                {
                  op: '>',
                  value: 0,
                },
              ],
            },
            {
              this: 'enddate',
              other: 'enddate',
              and: [
                {
                  op: '<',
                  value: 0,
                },
              ],
            },
          ],
        }
        const thisBeforeThat = {
          value: data.targetInteraction,
          filter: [
            {
              this: 'enddate',
              other: 'startdate',
              and: [
                {
                  op: '>',
                  value: 0,
                },
              ],
            },
            {
              this: 'enddate',
              other: 'enddate',
              and: [
                {
                  op: '<',
                  value: 0,
                },
              ],
            },
          ],
        }
        const thatBeforeThis = {
          value: data.targetInteraction,
          filter: [
            {
              this: 'startdate',
              other: 'startdate',
              and: [
                {
                  op: '>',
                  value: 0,
                },
              ],
            },
            {
              this: 'startdate',
              other: 'enddate',
              and: [
                {
                  op: '<',
                  value: 0,
                },
              ],
            },
          ],
        }
        timeFilterDataObject.push({
          or: [thisContainThat, thatContainThis, thisBeforeThat, thatBeforeThis],
        })
      } else {
        if (AdvancedTimeFilterModel.validateText(data.days)) {
          const otherObject = {
            value: data.targetInteraction,
            filter: [],
          }
          let existingObjectIndex = -1
          for (let ii = 0; ii < timeFilterDataObject.length; ii += 1) {
            if (!timeFilterDataObject[ii].or && timeFilterDataObject[ii].value) {
              if (timeFilterDataObject[ii].value === data.targetInteraction) {
                existingObjectIndex = ii
              }
            }
          }

          const filterObj = {
            this: data.originSelection,
            other:
              data.targetSelection === 'before_startdate' || data.targetSelection === 'after_startdate'
                ? 'startdate'
                : 'enddate',
            and: [],
          }

          rangeRegex.lastIndex = 0
          operatorRegex.lastIndex = 0
          numRegex.lastIndex = 0

          if (rangeRegex.test(data.days)) {
            rangeRegex.lastIndex = 0
            const rangeOp = rangeRegex.exec(data.days)
            let operator1 = rangeOp[1] === ']' ? '>' : '>='
            let value1 = parseInt(rangeOp[2], 10)
            let operator2 = rangeOp[4] === '[' ? '<' : '<='
            let value2 = parseInt(rangeOp[3], 10)
            if (data.targetSelection === 'after_startdate' || data.targetSelection === 'after_enddate') {
              operator1 = operator1.replace('>', '<')
              operator2 = operator2.replace('<', '>')
              value1 *= -1
              value2 *= -1
            }
            filterObj.and.push({
              op: operator1,
              value: value1,
            })
            filterObj.and.push({
              op: operator2,
              value: value2,
            })
          } else if (operatorRegex.test(data.days)) {
            operatorRegex.lastIndex = 0
            const opOp = operatorRegex.exec(data.days)
            let operator1 = opOp[1]
            let value1 = parseInt(opOp[2], 10)
            if (data.targetSelection === 'after_startdate' || data.targetSelection === 'after_enddate') {
              operator1 = operator1.replace('>', '*')
              operator1 = operator1.replace('<', '>')
              operator1 = operator1.replace('*', '<')
              value1 *= -1
            }
            filterObj.and.push({
              op: operator1,
              value: value1,
            })
          } else if (numRegex.test(data.days)) {
            numRegex.lastIndex = 0
            let value1 = parseInt(numRegex.exec(data.days)[0], 10)
            const operator1 = '>='
            const operator2 = '<='

            if (data.targetSelection === 'after_startdate' || data.targetSelection === 'after_enddate') {
              value1 *= -1
            }
            filterObj.and.push({
              op: operator1,
              value: value1,
            })
            filterObj.and.push({
              op: operator2,
              value: value1,
            })
          } else {
            filterObj.and.push({
              op: data.targetSelection === 'before_startdate' || data.targetSelection === 'before_enddate' ? '>' : '<',
              value: 0,
            })
          }

          if (existingObjectIndex >= 0) {
            timeFilterDataObject[existingObjectIndex].filter.push(filterObj)
          } else {
            otherObject.filter.push(filterObj)
            timeFilterDataObject.push(otherObject)
          }
        }
      }
    }

    return [{ and: timeFilterDataObject }]
  }

  public props: any
  constructor(newProps) {
    const defaultProps = {
      type: 'advancedtimefilter',
      filterCardId: '',
      filterCardName: '',
      timeFilterTitle: '',
      visible: false,
      timeFilterModel: {
        timeFilters: [],
      },
    }
    this.props = { ...defaultProps, ...newProps }
  }
}
