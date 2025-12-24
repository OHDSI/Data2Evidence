import ConstraintBase from './ConstraintBase'

/**
 * Constructor for a new LegacyRangeConstraint.
 * @constructor
 * @param {string} [sId]       id for the new control, generated automatically if no id is given
 * @param {object} [mSettings] initial settings for the new control
 *
 * @classdesc
 * Legacy Constraint that allows input of a start and end point to define a range.
 * @extends hc.mri.pa.ui.lib.Constraint
 * @alias hc.mri.pa.ui.lib.LegacyRangeConstraint
 */
class LegacyRangeConstraintModel extends ConstraintBase {
  constructor(mriFrontendConfig, newProps) {
    super(mriFrontendConfig, newProps)
    this.mriFrontendConfig = mriFrontendConfig
    const defaultProps = {
      type: 'legacyrangeconstraint',
    }
    this.props = { ...this.props, ...defaultProps, ...newProps }
  }
}

export default LegacyRangeConstraintModel
