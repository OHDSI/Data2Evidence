import ConstraintBase from './ConstraintBase'

class DateTimeConstraintModel extends ConstraintBase {
  public declare props: datetimeConstraintProps
  constructor(mriFrontendConfig, newProps) {
    super(mriFrontendConfig, newProps)
    this.mriFrontendConfig = mriFrontendConfig
    const defaultProps = {
      type: 'datetime',
      fromDate: {
        value: '',
        state: '',
        tooltip: '',
      },
      toDate: {
        value: '',
        state: '',
        tooltip: '',
      },
    }
    this.props = { ...this.props, ...defaultProps, ...newProps }
  }

  public clear() {
    this.props.fromDate.value = ''
    this.props.toDate.value = ''
  }

  public addBooleanExpression(aExpressions: any[]) {
    aExpressions.forEach(function (mExpression) {
      this.addExpression(mExpression.operator, mExpression.value)
    }, this)
  }

  public addExpression(sOperator: string, sValue: string) {
    if (sOperator === '>=') {
      this.props.fromDate.value = sValue
    } else if (sOperator === '<=') {
      this.props.toDate.value = sValue
    } else {
      throw new Error(`DateTimeConstraint does not support operator ${sOperator}`)
    }
  }
}

export default DateTimeConstraintModel
