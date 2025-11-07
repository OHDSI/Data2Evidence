import MriFrontendConfig from '../MriFrontEndConfig'
import EntityBase from './EntityBase'

export default class ConstraintBase extends EntityBase {
  /**
   * Set some values to the constraint.
   * @abstract
   * @param {string[]} values    The values to be added.
   * @param {hc.mri.pa.ui.Utils.valuesMergeMode} [mergeMode] The
   * merge strategy between existing values
   *        and new values.
   */
  public static setFilterValues(values, mergeMode) {
    throw new Error('setFilterValues must be implemented by Constraint subclass')
  }

  public props: IConstraintBaseProps
  public mriFrontendConfig: MriFrontendConfig
  constructor(mriFrontendConfig, newProps) {
    super()
    this.mriFrontendConfig = mriFrontendConfig
    const defaultProps = {
      type: 'constraintbase',
      attributePath: '',
      instanceId: '',
      parents: [],
      attrKey: '',
    }
    this.props = { ...this.props, ...defaultProps, ...newProps }
    const attrPathComponents = this.props.attributePath.split('.')
    this.props.attrKey = attrPathComponents[attrPathComponents.length - 1]
  }

  /**
   * Removes all input on the constraint, i.e., resetting it to the initial state.
   */
  public clear() {
    throw new Error(`clear must be implemented by Constraint subclass - ${this.props.instanceId}`)
  }
}
