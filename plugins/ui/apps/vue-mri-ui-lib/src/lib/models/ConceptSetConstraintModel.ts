import ConstraintBase from './ConstraintBase'
import store from '../../store'

/**
 * Constructor for a new ConceptSetConstraint.
 * @constructor
 * @param {string} [sId] id for the new control, generated automatically if no id is given
 * @param {object} [mSettings] initial settings for the new control
 *
 * @classdesc
 * Constraint that gets value suggestions from a domain.
 * @extends hc.mri.pa.ui.lib.Constraint
 * @alias hc.mri.pa.ui.lib.ConceptSetConstraint
 */
class ConceptSetConstraintModel extends ConstraintBase {
  public declare props: conceptSetConstraintProps
  // export default class DomainConstraintModel {
  constructor(mriFrontendConfig, newProps) {
    super(mriFrontendConfig, newProps)
    this.mriFrontendConfig = mriFrontendConfig
    const defaultProps = {
      type: 'conceptSet',
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
      const conceptSetName = store.state.domainService.domainValues.conceptSets?.values?.find(
        set => set.value === value
      )?.text
      this.props.value.push({
        value,
        score: 1,
        display_value: conceptSetName,
        text: conceptSetName,
      })
    } else {
      throw new Error(`ConceptSetConstraint does not support operator ${sOperator}`)
    }
  }
}

export default ConceptSetConstraintModel
