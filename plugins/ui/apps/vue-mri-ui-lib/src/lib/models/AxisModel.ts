import EntityBase from './EntityBase'

export default class AxisModel extends EntityBase {
  public props: any
  constructor(newProps) {
    super()
    const defaultProps = {
      seq: 0,
      filterCardId: '',
      key: '',
      icon: '',
      iconFamily: '',
      binsize: '',
      active: false,
      isCategory: false,
      isMeasure: false,
      layoutLeft: 0,
      layoutTop: 0,
      layoutBottom: 0,
    }
    this.props = { ...defaultProps, ...newProps }
  }
}
