import ConstraintBase from './ConstraintBase'

/**
 * Constructor for a new DomainConstraint.
 * @constructor
 * @param {string} [sId] id for the new control, generated automatically if no id is given
 * @param {object} [mSettings] initial settings for the new control
 *
 * @classdesc
 * Constraint that gets value suggestions from a domain.
 * @extends hc.mri.pa.ui.lib.Constraint
 * @alias hc.mri.pa.ui.lib.DomainConstraint
 */
class DomainConstraintModel extends ConstraintBase {
  public declare props: domainConstraintProps
  // export default class DomainConstraintModel {
  constructor(mriFrontendConfig, newProps) {
    super(mriFrontendConfig, newProps)
    this.mriFrontendConfig = mriFrontendConfig
    const defaultProps = {
      type: 'text',
      name: '',
      instanceId: '',
      attributePath: '',
      value: [],
    }
    this.props = { ...this.props, ...defaultProps, ...newProps }
  }

  /**
   * Resets the Constraint to the initial state.
   */
  public clear() {
    this.props.value = []
  }

  public setValues(values) {
    this.props.value = values
  }

  public addExpression(sOperator: string, value: string) {
    if (sOperator === '=') {
      this.props.value.push({
        value,
        score: 1,
        display_value: value,
        text: value,
      })
    } else {
      throw new Error(`DomainConstraint does not support operator ${sOperator}`)
    }
  }
}

export default DomainConstraintModel
