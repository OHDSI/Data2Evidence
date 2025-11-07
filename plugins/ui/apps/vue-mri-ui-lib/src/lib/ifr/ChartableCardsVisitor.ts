class ChartableCardsVisitor {
  public oConfig: any
  public aFilterCards: any[]
  public mCurrentFilterCard: {
    aAttributes: any
    sFilterCardConfigPath: any
    sFilterCardInstance: any
    sFilterCardName: any
  }
  constructor(frontendConfig) {
    this.oConfig = frontendConfig
    this.aFilterCards = []
  }

  public getChartableCards() {
    return this.aFilterCards
  }

  public visitFilter(mConfigMetadata, oCard) {
    oCard.accept(this)
  }

  public visitAnd(aAndContent) {
    aAndContent.forEach(oBooleanContainer => {
      oBooleanContainer.accept(this)
    })
  }

  public visitOr() {
    /* Ignore or section */
    return this
  }

  public visitNot() {
    /* Ignore excluded cards */
    return this
  }

  public visitFilterCard(
    sConfigPath,
    iInstanceNumber,
    sInstanceID,
    sCardName,
    oSuccessor,
    oAdvanceTimeFilter,
    oParentInteraction,
    oAttributes,
    bInactive
  ) {
    if (bInactive) {
      return
    }
    const aAttributes = this.oConfig
      .getFilterCardByPath(sConfigPath)
      .getAllAttributes()
      .map(oAttributeConfig => ({
        sConfigPath: oAttributeConfig.sConfigPath,
        sParentPath: oAttributeConfig.sParentPath,
        name: oAttributeConfig.oInternalConfigAttribute.name,
        category: oAttributeConfig.oInternalConfigAttribute.category,
        measure: oAttributeConfig.oInternalConfigAttribute.measure,
        aggregated: oAttributeConfig.oInternalConfigAttribute.aggregated,
      }))
    this.mCurrentFilterCard = {
      aAttributes,
      sFilterCardConfigPath: sConfigPath,
      sFilterCardInstance: sInstanceID,
      sFilterCardName: sCardName,

      // id: sConfigPath,
      // instanceId: sInstanceID,
      // key: oFilterCard.props.key,
      // name: oFilterCard.props.name,
      // excludeFilter: oFilterCard.props.excludeFilter,
    }
    this.aFilterCards.push(this.mCurrentFilterCard)
    oAttributes.accept(this)
  }

  public visitAttribute(sConfigPath, sInstanceID) {
    this.mCurrentFilterCard.aAttributes.some(mAttributeInformation => {
      if (mAttributeInformation.sAttributeInstance === sInstanceID) {
        mAttributeInformation.bAvailable = true
        return true
      }
      return false
    })
  }
}

export default function getChartableCards(oIFR, frontendConfig) {
  const oChartableCardsVisitor = new ChartableCardsVisitor(frontendConfig)
  oIFR.accept(oChartableCardsVisitor)
  return oChartableCardsVisitor.getChartableCards()
}
