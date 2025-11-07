import FilterCardModel from './FilterCardModel'

export default class VariantFilterCardModel extends FilterCardModel {
  public declare props: any
  public mriFrontendConfig: any = null
  constructor(mriFrontendConfig, newProps) {
    super(mriFrontendConfig, newProps)
    const defaultProps = {
      type: 'variantfiltercard',
    }
    this.props = { ...this.props, ...defaultProps, ...newProps }
    this.mriFrontendConfig = mriFrontendConfig
    return this
  }
}
