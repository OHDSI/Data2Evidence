import TextUtils from '../utils/TextUtils'

/**
 * Constructor for a new MriConfigPatientList.
 * @constructor
 * @param {object} oInternalConfig Config object
 *
 * @classdesc
 * MriConfigPatientList Class.
 * @alias hc.mri.pa.ui.lib.MriConfigPatientList
 */
export default class MriConfigPatientList {
  public oInternalConfig: any
  public aAttributes: any[]
  public mInteractions: {}
  constructor(oInternalConfig) {
    this.oInternalConfig = oInternalConfig
    this.aAttributes = []
    this.mInteractions = {}
  }

  public addInteractionAttributes(path, oInteraction, aAttributes) {
    if (aAttributes.length > 0) {
      this.mInteractions[path] = {
        path,
        name: path !== 'patient' ? oInteraction.name : TextUtils.getText('MRI_PA_MENUITEM_INTERACTIONS_GENERAL'),
        interaction: oInteraction,
        attributes: aAttributes,
      }

      aAttributes.forEach(attribute => {
        this.aAttributes.push(attribute)
      })
    }
  }

  public getInitialTableColumns(): string[] {
    return this.oInternalConfig.chartOptions.list.initialColumns
  }

  /**
   * Get the list of Attributes that can be used in the Patient List.
   * @returns {Object[]} List of Attributeinformation
   */
  public getAllAttributes() {
    return this.aAttributes
  }

  public getBasicDataCols() {
    const cols = this.getColumnsByInteractions(true, false)
    return cols.length > 0 ? cols[0] : {}
  }

  public getAllNonBasicDataColumnsByInteractions() {
    return this.getColumnsByInteractions(false, true)
  }

  public getColumnsByInteractions = (withBasicData, withNonBasicData) => {
    const colsByInteraction = []

    function getNewInteraction(internalInteraction, isBasicData) {
      const interaction = {
        isBasicData,
        name: internalInteraction.name,
        path: internalInteraction.path,
        order: internalInteraction.interaction ? internalInteraction.interaction.order : 0,
        attributes: internalInteraction.attributes.slice(0),
      }

      interaction.attributes.sort((a1, a2) => a1.getOrderInFilterCard() - a2.getOrderInFilterCard())

      return interaction
    }

    Object.keys(this.mInteractions).forEach(name => {
      const interaction = this.mInteractions[name]
      if ((withNonBasicData && name !== 'patient') || (withBasicData && name === 'patient')) {
        colsByInteraction.push(getNewInteraction(interaction, name === 'patient'))
      }
    })

    colsByInteraction.sort((i1, i2) => i1.order - i2.order)

    return colsByInteraction
  }

  public getDefaultPageSize() {
    const pageSize = this.oInternalConfig.chartOptions.list.pageSize
    return pageSize > 0 ? pageSize : 20
  }

  public getInteractionByPath(sPath) {
    return this.mInteractions[sPath]
  }
}
