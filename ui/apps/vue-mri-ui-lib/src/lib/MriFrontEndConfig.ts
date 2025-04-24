// tslint:disable:variable-name
// tslint:disable:no-increment-decrement
// tslint:disable:no-console
// tslint:disable:no-parameter-reassignment
import JSONUtils from '../utils/JSONUtils'
import BooleanContainers from './ifr/BooleanContainers'
import InternalFilterRepresentation from './ifr/InternalFilterRepresentation'
import MriConfigAttribute from './MriConfigAttribute'
import MriConfigFilterCard from './MriConfigFilterCard'
import MriConfigPatientList from './MriConfigPatientList'

let _instance

/**
 * Create an MriFrontendConfig instance from a given config object.
 * This function has to be called before the instance is used in the application.
 * It should only be called once in the Component.
 * @constructor
 * @private
 * @param   {Object} mConfig Mri config object
 */

export default class MriFrontendConfig {
  /**
   * Get the config path from a MRI path-ID. This is a temporary
   * solution until we completely decouple the
   * MRI path/IDs from the config path.
   * @param   {string} sMriPath The path in the MRI Filter Object
   * @returns {string} The config path corresponding to the attribute or the instance.
   * @name hc.mri.pa.ui.lib.MriFrontendConfig.convertInternalPathToConfigPath
   */
  public static convertInternalPathToConfigPath(sMriPath) {
    let sConfiPath = sMriPath
    if (sMriPath.substring(0, 4) === 'all.') {
      sConfiPath = sConfiPath.replace('all.', '')
    }
    if (sMriPath.substring(0, 4) === 'any.') {
      sConfiPath = sConfiPath.replace('any.', '')
    }

    return sConfiPath
  }
  public static createFrontendConfig(mConfig) {
    _instance = new MriFrontendConfig(mConfig)
  }

  public static hasFrontendConfig() {
    return Boolean(_instance)
  }

  public static getFrontendConfig() {
    if (!_instance) {
      const sMessage = 'FrontendConfig has to be created before usage'
      const sComponent = 'MriFrontendConfig.getFrontendConfig'
      console.error(sMessage, null, sComponent)
    }
    return _instance
  }

  public _internalConfig: any
  public _configMetadata: any

  public _aFilterCards: any[]
  public _mFilterCards: any
  public _aAttributes: any[]
  public _mAttributes: any
  public _oPatientListConfig: any
  public _oJsonWalk: (path: string) => any[]

  constructor(mConfig) {
    this._internalConfig = mConfig.config
    this._configMetadata = mConfig.meta

    this._aFilterCards = []
    this._mFilterCards = {}
    this._aAttributes = []
    this._mAttributes = {}
    this._oPatientListConfig = {}

    this._oJsonWalk = JSONUtils.getJsonWalkFunction(this._internalConfig)
    const aConfigInteractions = this._oJsonWalk('patient')
      .concat(this._oJsonWalk('patient.interactions.*'))
      .concat(this._oJsonWalk('patient.**.interactions.*'))

    // add the patientList config member
    this._oPatientListConfig = new MriConfigPatientList(this._internalConfig)

    let isFilterCardVisible

    for (let i = 0; i < aConfigInteractions.length; i++) {
      isFilterCardVisible =
        typeof aConfigInteractions[i].obj.filtercard === 'undefined' ||
        aConfigInteractions[i].obj.filtercard.visible === true

      const aConfigAttributes = this._oJsonWalk(`${aConfigInteractions[i].path}.attributes.*`)
      const aPatientListAttributes: any[] = [] // only attributes visible in the Patient list
      const aCurrentAttributes: any[] = []

      for (let j = 0; j < aConfigAttributes.length; j++) {
        const newAttribute = new MriConfigAttribute(
          aConfigAttributes[j].path,
          aConfigAttributes[j].obj,
          aConfigInteractions[i].path
        )

        this._aAttributes.push(newAttribute)
        this._mAttributes[aConfigAttributes[j].path] = newAttribute
        aCurrentAttributes.push(newAttribute)

        // only add visible attributes to the patientList
        if (aConfigAttributes[j].obj.patientlist && aConfigAttributes[j].obj.patientlist.visible) {
          aPatientListAttributes.push(newAttribute)
        }
      }

      if (isFilterCardVisible) {
        const newFilterCard = new MriConfigFilterCard(
          aConfigInteractions[i].path,
          aConfigInteractions[i].obj,
          aCurrentAttributes
        )

        this._aFilterCards.push(newFilterCard)

        this._mFilterCards[aConfigInteractions[i].path] = newFilterCard
      }

      this._oPatientListConfig.addInteractionAttributes(
        aConfigInteractions[i].path,
        aConfigInteractions[i].obj,
        aPatientListAttributes
      )
    }

    // sort the filter cards by the order
    this._aFilterCards.sort((f1, f2) => f1.getOrder() - f2.getOrder())
  }

  public getUnmodified() {
    return this._internalConfig
  }

  public getConfigMetadata() {
    return {
      configId: this.getPaConfigId(),
      configVersion: this.getPaConfigVersion(),
    }
  }

  /**
   * Add the config metadata required for most MRI PA requests and stringify the result
   * @param   {object} mData Object containing data for the request
   * @returns {string} Stringified version of the object with added config metadata.
   */
  public addConfigMetadata(mData) {
    mData.configData = this.getConfigMetadata()
    return JSON.stringify(mData)
  }

  public getVersion() {
    return this._configMetadata.dependentConfig.configVersion
  }

  public getDatamodelConfigId() {
    return this._configMetadata.dependentConfig.configId
  }

  public getPaConfigId() {
    return this._configMetadata.configId
  }

  public getPaConfigVersion() {
    return this._configMetadata.configVersion
  }

  public getBasicDataFilterCard() {
    return this._mFilterCards.patient
  }

  public getFilterCards() {
    return this._aFilterCards
  }

  public getPatientListConfig() {
    return this._oPatientListConfig
  }

  public walkJsonPath(sPattern) {
    return this._oJsonWalk(sPattern)
  }

  public getFilterCardByPath(sPath) {
    return this._mFilterCards[sPath]
  }

  public getPageTitle() {
    return this._internalConfig.pageTitle
  }

  public getChartOptions(sChartType) {
    return this._internalConfig.chartOptions[sChartType]
  }

  public isNoValueTextCustomized() {
    //  Using Customized No Value Text
    if (this._internalConfig.panelOptions && this._internalConfig.panelOptions.noValueText) {
      return this._internalConfig.panelOptions.noValueText.customizedNoValueText === true
    }
    return false
  }

  public getAttributeList() {
    return this._aAttributes
  }

  /**
   * Returns the details of certain panel eg visible, enabled etc
   * @param   {string} sPanelType Type of panel eg any filter panel or all filter panel
   * @returns {Object} Object of panel config
   */
  public getPanelOptions(sPanelType) {
    return this._internalConfig.panelOptions[sPanelType]
  }

  public getAttributeByPath(sPath) {
    // make it also work for instance of interactions,
    // like [...].interactions.priDiag.1.attributes.[...]
    return this._mAttributes[this.getGenericPath(sPath)]
  }

  /**
   * Given a full attribute path, returns the part of the path
   * before the .attributes part (i.e. for a
   * interaction instance, the instance number will be part of
   * the path e.g.: "patient.interactions.priDiag.1")
   * @param   {string} sPath Full attribute path
   * @returns {string} Interaction path
   */
  public getInteractionInstancePath(sPath) {
    const aParts = /(.*)?\.attributes\.(.*)/.exec(sPath)
    return aParts ? aParts[1] : null
  }

  /**
   * Given a particular path in the filter object, get the generic config path
   * by removing the .<instance_number> parts of the path
   * @param   {string} sPath Full attribute path
   * @returns {string} Full generic path
   */
  public getGenericPath(sPath) {
    let genericPath = sPath.replace(/\.\d+\./g, '.')

    // covers where the instance number is at the end of the string e.g. [..].priDiag.1
    genericPath = genericPath.replace(/\.\d+$/g, '')
    return genericPath
  }

  /**
   * Given a full attribute path in the filter object,
   * returns the attribute key only, i.e. the part after ".attributes."
   * @param   {string} sPath Full attribute path
   * @returns {string} Local attribute key
   */
  public getAttributeKeyFromPath(sPath) {
    const aParts = /(.*)?\.attributes\.(.*)/.exec(sPath)
    return aParts ? aParts[2] : null
  }

  public isValidFilterCardAttribute(sPath) {
    const aParts = /(.*?attributes\.)(.*)/.exec(sPath)
    const sAttrKey = aParts ? aParts[2] : null

    if (sAttrKey === '_succ' || sAttrKey === '_absTime' || sAttrKey === '_parentInteraction') {
      return true
    }
    // make it also work for instance of interactions,
    // like [...].interactions.priDiag.1.attributes.[...]
    const genericPath = this.getGenericPath(sPath)
    return this._mAttributes[genericPath] && this._mAttributes[genericPath].isVisibleInFilterCard()
  }

  /**
   * Checks validity of an annotated configuration path
   * @param   {string}      sPath  Full attribute path
   * @returns {boolean}     True for valid annotated path
   */
  public isValidFilterCardAnnotatedAttribute(sPath) {
    const aParts = /(.*?attributes\.)(.*)/.exec(sPath)
    const sAttrKey = aParts ? aParts[2] : null

    if (sAttrKey === '_succ' || sAttrKey === '_absTime' || sAttrKey === '_parentInteraction') {
      return true
    }

    const attribute = this.getAttributeByAnnotatedPath(sPath)

    return attribute.length === 1
  }

  public isChartVisible(chartType) {
    if (this._internalConfig.chartOptions[chartType]) {
      return this._internalConfig.chartOptions[chartType].visible
    }
    return false
  }
  /**
   * Availability of Collection feature
   * @param {any} chartType
   * @returns Boolean
   * @memberof MriFrontendConfig
   */
  public isChartCollectionEnabled(chartType) {
    return this._internalConfig.chartOptions[chartType].collectionEnabled === true
  }

  public isChartDownloadEnabled(chartType) {
    // Availability of Data download
    return this._internalConfig.chartOptions[chartType].downloadEnabled === true
  }

  public isChartPDFDownloadEnabled(chartType) {
    // Availability of PDF Data download
    return this._internalConfig.chartOptions[chartType].pdfDownloadEnabled === true
  }

  public getInitialChart() {
    return this._internalConfig.chartOptions.initialChart
  }

  public isMatchAnyFilterEnabled() {
    //  Availability of Match Any Filtercard feature
    return this._internalConfig.panelOptions.afp.visible === true
  }

  public isAdvancedTimeFilteringEnabled() {
    //  Availability of Advanced Time Filtering feature
    return this._internalConfig.panelOptions.advancedTimeFiltering.useNextInteraction === true
  }

  /**
   * Returns an array containing the paths to the filter cards that
   * contains at least an attribute with a specific annotation.
   * If no such a FC is found, an empty array is returned.
   * @param   {string}   sAnnotation Annotation name
   * @returns {string[]} List of paths
   */
  public getInterHavingAttrAnnotation(sAnnotation) {
    const paths: any[] = []
    this.getFilterCards().forEach(inter => {
      if (inter.hasAnnotation(sAnnotation)) {
        paths.push(inter.getConfigPath())
      }
    })
    return paths
  }

  /**
   * Returns an array containing Annotations of an attribute
   * @param   {sPath}     sPath Configuration path of the attribute
   * @returns {string[]}  List of annotations
   */
  public getAnnotationByPath(sPath) {
    const attr = this.getAttributeByPath(sPath)
    if (attr) {
      return attr.getAnnotations()
    }

    return null
  }

  /**
   * Retrieves an array of attributes that has annotated config path sPath.
   * Ideally the array should have a length of 1.
   * @param   {string}    sPath Configuration path of the attribute
   * @returns {string[]}  List of attributes
   */
  public getAttributeByAnnotatedPath(sPath) {
    let attribute = []
    this.getFilterCards().forEach(inter => {
      attribute = attribute.concat(inter.getAttributesWithAnnotation(sPath.split('.').pop()))
    })
    return attribute
  }

  /**
   * Get the initial IFR from the configuration.
   * @returns {hc.mri.pa.ui.lib.ifr.InternalFilterRepresentation.Filter} IFR Filter
   * @name hc.mri.pa.ui.lib.MriFrontendConfig.getInitialIFR
   */
  public getInitialIFR() {
    const aIFRFilterCards = this._aFilterCards
      .filter(oFilterCardConfig => oFilterCardConfig.isInitial())
      .map(oFilterCardConfig => {
        const sInstanceId = oFilterCardConfig.getConfigPath() + (oFilterCardConfig.isBasicData() ? '' : '.1')
        const aIFRAttributes = oFilterCardConfig
          .getAllAttributes()
          .filter(oAttributeConfig => oAttributeConfig.isInitialInFilterCard())
          .map(
            oAttributeConfig =>
              new InternalFilterRepresentation.Attribute({
                configPath: oAttributeConfig.getConfigPath(),
                constraints: new BooleanContainers.Empty(),
                instanceID: `${sInstanceId}.attributes.${oAttributeConfig.getConfigKey()}`,
              })
          )
        return new InternalFilterRepresentation.FilterCard({
          attributes: new BooleanContainers.And(aIFRAttributes),
          configPath: oFilterCardConfig.getConfigPath(),
          instanceID: sInstanceId,
          instanceNumber: 1,
          name: '',
        })
      })

    return this._getIFRWithFiltersInAllPart(aIFRFilterCards)
  }

  /**
   * Internal function building a base IFR, opt.
   * @private
   * @param {hc.mri.pa.ui.lib.ifr.InternalFilterRepresentation.FilterCard[]} andFilterCards
   * Array of FilterCards to be put into the ALL part.
   * @returns {hc.mri.pa.ui.lib.ifr.InternalFilterRepresentation.Filter} IFR Filter
   * @name hc.mri.pa.ui.lib.MriFrontendConfig.getEmptyIFR
   */
  public _getIFRWithFiltersInAllPart(andFilterCards) {
    andFilterCards = andFilterCards || []

    // Convert Filtercards to BoolFilterContainers
    const boolFilterCards = andFilterCards.map(c => new BooleanContainers.Or([c]))

    return new InternalFilterRepresentation.Filter({
      configMetadata: new InternalFilterRepresentation.ConfigMetadata(this.getPaConfigVersion(), this.getPaConfigId()),
      cards: new BooleanContainers.And(boolFilterCards),
    })
  }

  public getTranslationList() {
    return this._aAttributes.map(
      attribute =>
        // Utils.getText('MRI_PA_NO_VALUE_CUSTOM', attribute.oInternalConfigAttribute.name)
        `MRI_PA_NO_VALUE_CUSTOM: ${attribute.oInternalConfigAttribute.name}`
    )
  }

  /**
   * Transform all values within an object according to the translation
   * @param   {Object} Object to be translated
   * @returns {Object} The same object with all values within it translated
   */
  public translate(obj) {
    if (!obj) {
      return null
    }
    Object.keys(obj).forEach(k => {
      switch (typeof obj[k]) {
        case 'object':
          if (obj[k] instanceof Array) {
            obj[k] = this._translate(obj[k], k)
          } else {
            this.translate(obj[k])
          }
          break
        case 'string':
          obj[k] = this._translate(obj[k], k)
          break
        default:
          break
      }
    })
    return obj
  }

  public _translate(str, key) {
    const attribute = this.getAttributeByPath(key)
    if (str === 'NoValue') {
      // return Utils.getText('MRI_PA_NO_VALUE_CUSTOM', attribute.oInternalConfigAttribute.name);
      return `MRI_PA_NO_VALUE_CUSTOM: ${attribute.oInternalConfigAttribute.name}`
    }
    return str
  }

  /**
   * Perform a reverse translation within an object according to the translation
   *  @param   {Object} Object to be translated
   *  @returns {Object} The same object with all values within it translated
   */
  public reverseTranslate(obj, list) {
    function _reverseTranslate(str, list2) {
      if (list2.indexOf(str) > -1) {
        return 'NoValue'
      }
      return str
    }

    if (!obj) {
      return null
    }
    if (!list) {
      list = this.getTranslationList()
    }
    Object.keys(obj).forEach(k => {
      switch (typeof obj[k]) {
        case 'object':
          this.reverseTranslate(obj[k], list)
          break
        case 'string':
          obj[k] = _reverseTranslate(obj[k], list)
          break
        default:
          break
      }
    })
    return obj
  }

  public getInitialAxisSelection() {
    // const result = [
    //   hc.mri.pa.ui.lib.Selection.Invalid,
    //   hc.mri.pa.ui.lib.Selection.Invalid,
    //   hc.mri.pa.ui.lib.Selection.Invalid,
    //   hc.mri.pa.ui.lib.Selection.Invalid,
    //   hc.mri.pa.ui.lib.Selection.Invalid,
    //   hc.mri.pa.ui.lib.Selection.Invalid,
    // ];
    const result = [
      'hc.mri.pa.ui.lib.Selection.Invalid',
      'hc.mri.pa.ui.lib.Selection.Invalid',
      'hc.mri.pa.ui.lib.Selection.Invalid',
      'hc.mri.pa.ui.lib.Selection.Invalid',
      'hc.mri.pa.ui.lib.Selection.Invalid',
      'hc.mri.pa.ui.lib.Selection.Invalid',
    ]
    this._aFilterCards.forEach(oneFilterCardConfig => {
      if (oneFilterCardConfig.isInitial()) {
        oneFilterCardConfig.getAllAttributes().forEach(oneConfigAttribute => {
          const measuresInitialIndex = this._internalConfig.chartOptions.initialAttributes.measures.indexOf(
            oneConfigAttribute.getConfigPath()
          )
          const categoriesInitialIndex = this._internalConfig.chartOptions.initialAttributes.categories.indexOf(
            oneConfigAttribute.getConfigPath()
          )
          if (
            oneConfigAttribute.isInitialInFilterCard() ||
            measuresInitialIndex !== -1 ||
            categoriesInitialIndex !== -1
          ) {
            const instancePath = `${
              oneFilterCardConfig.getConfigPath() + (oneFilterCardConfig.isBasicData() ? '' : '.1')
            }.attributes.${oneConfigAttribute.getConfigKey()}`

            if (measuresInitialIndex >= 0) {
              result[4 + measuresInitialIndex] = instancePath
            }

            if (categoriesInitialIndex >= 0) {
              result[categoriesInitialIndex] = instancePath
            }
          }
        }, this)
      }
    }, this)
    return result
  }

  public getFilterCardByInstanceId(instanceId) {
    return this.getFilterCardByPath(this.getGenericPath(instanceId))
  }
}
