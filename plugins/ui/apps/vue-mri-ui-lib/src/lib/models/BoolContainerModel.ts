import BooleanContainers from '../../lib/ifr/BooleanContainers'
import InternalFilterRepresentation from '../../lib/ifr/InternalFilterRepresentation'
import KeyCounter from '../../lib/utils/KeyCounter'
import EntityBase from './EntityBase'

export default class BoolContainer extends EntityBase {
  /**
   * Increment and return the index number for a FilterCard type.
   * @param   {string} sConfigPath Config path for the FilterCard type
   * @returns {number} New index number.
   */
  public static getNextFilterCardNumber(sConfigPath) {
    return KeyCounter.getInstance().getNextValueFor(sConfigPath)
  }

  /**
   * Set the index number for a FilterCard type.
   * @param   {string} sConfigPath Config path for the FilterCard type
   * @param   {number} iNumber     New index number
   */
  public static setNextFilterCardNumber(sConfigPath, iNumber) {
    KeyCounter.getInstance().setNextValueFor(sConfigPath, iNumber)
  }

  /**
   * Release an index number for a FilterCard type.
   * @param   {string} sConfigPath Config path for the FilterCard type
   * @param   {number} iNumber     index number to be released
   */
  public static releaseFilterCardNumber(sConfigPath, iNumber) {
    KeyCounter.getInstance().releaseIndexFor(sConfigPath, iNumber)
  }

  /**
   * Block an index number for a FilterCard type.
   * @param   {string} sConfigPath Config path for the FilterCard type
   * @param   {number} iNumber     index number to be released
   */
  public static blockFilterCardNumber(sConfigPath, iNumber) {
    KeyCounter.getInstance().blockIndexFor(sConfigPath, iNumber)
  }
  public mriFrontendConfig: any
  public props: any
  constructor(mriFrontendConfig?) {
    super()
    this.mriFrontendConfig = mriFrontendConfig
    this.props = {
      type: 'boolcontainer',
      /**
       * The maximum width for all Constraint labels.
       */
      descriptionColumnsMaxWidth: 0,
      /**
       * BoolContainer to represent boolean logic between FilterCards.
       */
      boolfiltercontainers: [],
    }

    KeyCounter.getKeyCountingStrategy('default', 1)
  }

  public getContent() {
    return this.props.boolfiltercontainers
  }

  public getIFR() {
    const id = this.mriFrontendConfig.getPaConfigId()
    const version = this.mriFrontendConfig.getPaConfigVersion()
    const aContent = this.getContent().map(oBoolFilterContainer => {
      const oIFR = oBoolFilterContainer.getIFR()
      return oBoolFilterContainer.getAllContainer() ? new BooleanContainers.And(oIFR) : new BooleanContainers.Or(oIFR)
    })
    return new InternalFilterRepresentation.Filter({
      configMetadata: new InternalFilterRepresentation.ConfigMetadata(version, id),
      cards: aContent.length ? new BooleanContainers.And(aContent) : new BooleanContainers.Empty(),
    })
  }

  public setFilterValues(sInteractionInstancePath, sAttributeKey, aValues, mergeMode) {
    if (this.getContent() && this.getContent()[0]) {
      return this.getContent()[0].setFilterValues(sInteractionInstancePath, sAttributeKey, aValues, mergeMode)
    }
    return null
  }

  /**
   * Reset the FilterCard numbers and remove all Containers and their FilterCards.
   */
  public reset() {
    ;(this as any).resetFilterCardInstanceCounter()
    ;(this as any).removeAllContent()
  }

  /**
   * Set the maximum width for all Constraint labels.
   * @override
   * @param {number} iMaxWidth Max width in pixel
   */
  public setDescriptionColumnsMaxWidth(iMaxWidth) {
    this.props.descriptionColumnsMaxWidth = iMaxWidth
    this.getContent().forEach(oBoolFilterContainer => {
      oBoolFilterContainer.descriptionColumnsMaxWidth = iMaxWidth
    })
  }

  /**
   * Adds a BoolFilterContainer into the aggregation content.
   * Attaches listeners to the events fired by the BoolFilterContainer.
   * @override
   * @param {hc.mri.pa.ui.lib.BoolFilterContainer} oBoolFilterContainer
   * The BoolFilterContainer to add
   */
  public addContent(oBoolFilterContainer) {
    oBoolFilterContainer.parentId = this.id
    this.props.boolfiltercontainers.push(oBoolFilterContainer)
  }
}
