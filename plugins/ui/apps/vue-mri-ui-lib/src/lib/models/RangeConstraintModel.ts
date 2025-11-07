import ConstraintBase from './ConstraintBase'

/**
 * Constructor for a new RangeConstraint.
 * @constructor
 * @param {string} [sId]       id for the new control, generated automatically if no id is given
 * @param {object} [mSettings] initial settings for the new control
 *
 * @classdesc
 * Constraint that allows input of a range in several defined formats.
 * An interval can be defined open to one side, closed to both or as single point.
 * @extends hc.mri.pa.ui.lib.Constraint
 * @alias hc.mri.pa.ui.lib.RangeConstraint
 */
export default class RangeConstraint extends ConstraintBase {
  public declare props: rangeConstraintProps
  constructor(mriFrontendConfig, newProps) {
    super(mriFrontendConfig, newProps)
    this.mriFrontendConfig = mriFrontendConfig
    const defaultProps = {
      type: 'num',
      name: '',
      value: [],
      tooltip: '',
    }
    this.props = { ...this.props, ...defaultProps, ...newProps }
  }

  public clear() {
    this.props.value = []
  }

  public addExpression(sOperator: string, sValue: string) {
    this.props.value.push({
      op: sOperator,
      value: sValue,
    })
  }

  public addBooleanExpression(aExpressions: any[]) {
    this.props.value.push({
      and: aExpressions.map(mFilter => {
        return {
          op: mFilter.operator,
          value: mFilter.value,
        }
      }),
    })
  }
}
