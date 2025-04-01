import ConstraintBase from './ConstraintBase'

export default class SingleSelectionConstraintModel extends ConstraintBase {
  public declare props: singleselectionConstraintProps
  constructor(mriFrontendConfig, newProps) {
    super(mriFrontendConfig, newProps)
    this.mriFrontendConfig = mriFrontendConfig
    const defaultProps = {
      type: 'parentInteraction',
      name: '',
      value: null,
      dataSource: '', // this is to tell the control what items it needs to display
    }
    this.props = { ...this.props, ...defaultProps, ...newProps }
  }

  public clear() {
    this.props.value = null
  }

  // add expression
  public addExpression(sOperator, sValue) {
    if (sOperator === '=') {
      this.props.value = {
        value: sValue,
        text: '',
      }
    } else {
      throw new Error(`Single selection does not support operator ${sOperator}`)
    }
  }
}
