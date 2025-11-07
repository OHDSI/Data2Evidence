import Utils from '../../utils/TextUtils'
import KeyCounter from '../utils/KeyCounter'
import EntityBase from './EntityBase'
import FilterCardModel from './FilterCardModel'
import VariantFilterCardModel from './VariantFilterCardModel'

/**
 * Constructor for a new BoolFilterContainer.
 * @constructor
 * @param {string} [sId]       id for the new control, generated automatically if no id is given
 * @param {object} [mSettings] initial settings for the new control
 *
 * @classdesc
 * Filter Control.
 * @extends hc.mri.pa.ui.lib.BoolItem
 * @alias hc.mri.pa.ui.lib.BoolFilterContainer
 */
export default class BoolFilterContainer extends EntityBase {
  public static createFilterCard({
    boolFilterContainerProps,
    mriFrontendConfig,
    sConfigPath,
    iExternalIndex,
    sName,
    excludeFilter = false,
    allowParentConstraint = true,
    parentInteraction,
  }): FilterCardModel {
    const keyCounter: any = KeyCounter.getInstance()
    let oFilterCard: FilterCardModel
    if (sConfigPath === 'patient') {
      oFilterCard = new FilterCardModel(mriFrontendConfig, {
        key: sConfigPath,
        name: sName,
        allowExcludeOption: false,
        allowTimeConstraint: false,
        allowSuccessorConstraint: false,
        allowParentConstraint: allowParentConstraint || false,
        allowAdvancedTimeFilter: false,
        excludeFilter: excludeFilter || false,
        parentInteraction: parentInteraction || '',
      })

      return oFilterCard.reinit()
    }

    let iIndex
    if (typeof iExternalIndex === 'undefined' || iExternalIndex === null) {
      iIndex = keyCounter.getNextValueFor(sConfigPath)
    } else {
      // Block external index in counter to ensure correct counting
      keyCounter.blockIndexFor(sConfigPath, iExternalIndex)
      iIndex = iExternalIndex
    }

    const oFilterCardConfig = mriFrontendConfig.getFilterCardByPath(sConfigPath)

    const name = sName || `${oFilterCardConfig.getName()} ${Utils.getLetterForNumber(iIndex)}`

    const internalConfig = mriFrontendConfig.getUnmodified()
    const useNextInteraction =
      internalConfig && internalConfig.panelOptions && internalConfig.panelOptions.advancedTimeFiltering
        ? internalConfig.panelOptions.advancedTimeFiltering.useNextInteraction
        : true

    if (oFilterCardConfig.hasAnnotation('genomics_variant_location')) {
      // special case for mutation filter cards
      oFilterCard = new VariantFilterCardModel(mriFrontendConfig, {
        name,
        key: sConfigPath,
        index: iIndex,
        allowTimeConstraint: false,
        allowSuccessorConstraint: false,
        allowParentConstraint: allowParentConstraint || false,
        allowAdvancedTimeFilter: false,
        inactive: true,
        excludeFilter: excludeFilter || false,
      })
    } else {
      oFilterCard = new FilterCardModel(mriFrontendConfig, {
        name,
        key: sConfigPath,
        index: iIndex,
        allowSuccessorConstraint: true,
        allowParentConstraint:
          allowParentConstraint === undefined || allowParentConstraint === null ? true : allowParentConstraint,
        allowAdvancedTimeFilter: true,
        excludeFilter: excludeFilter || false,
        parentInteraction,
      })
    }

    return oFilterCard.reinit()
  }

  public parent: any
  public props: any
  constructor(public mriFrontendConfig, newProps) {
    super()
    this.mriFrontendConfig = mriFrontendConfig
    const defaultProps = {
      type: 'boolfiltercontainer',
      filterCardItemModel: {
        items: [],
        parents: [],
      },
      allContainer: false,
      headerText: '',
      separatorText: '',
      op: 'AND', // conditional operator used between self and its neighbor BoolFilterContainer
      filterCards: [],
    }

    this.props = { ...defaultProps, ...newProps }
  }

  public getContent() {
    return this.props.filterCards
  }

  public addContent(filterCard) {
    filterCard.parentId = this.id
    return this.props.filterCards.push(filterCard)
  }

  public getFilterCardById(cardId) {
    for (let i = 0; i < this.filterCards().length; i += 1) {
      const fCard = this.filterCards()[i]
      if (cardId === fCard.props.cardId) {
        return fCard
      }
    }
    return null
  }

  /**
   * This method enforces the contraints that every card can be a successor
   *  for at most one other card and
   * that the successsor chains should not create cycles
   *
   * The method is called after the successor pointer in any filter card has been modified
   *
   * First, the method checks if the successor pointer that was just
   *  changed creates a cycle. If this the case,
   * the successor pointer value is set back to None
   *
   * Then, the method goes through all other cards and make sure the
   *  none of them has the same successor pointer,
   * turning it into "None" if this is the case
   * @private
   * @param {hc.mri.pa.ui.lib.FilterCard} filterCard the filter card
   *  whose successor pointer has just been updated
   */
  public checkSuccessorPointers(filterCard) {
    const parrId = filterCard.getParentInteraction()
    let cons
    if (parrId) {
      if (this.checkParentNextCycle(this.getFilterCardByCardId(parrId), filterCard.props.cardId)) {
        cons = filterCard.getConstraintForAttribute('_parentInteraction')
        // cons.setValueState(sap.ui.core.ValueState.Error);
        cons.setValueState('ERROR')
        cons.setSelectedKey('')
        return
      }
    }

    const currId = FilterCardModel.getSuccessor(filterCard.props)
    if (currId) {
      if (this.checkParentNextCycle(this.getFilterCardByCardId(currId), filterCard.props.cardId)) {
        cons = filterCard.getConstraintForAttribute('_succ')
        // cons.setValueState(sap.ui.core.ValueState.Error);
        cons.setValueState('ERROR')
        cons.setSelectedKey('')
        return
      }
    }

    const disallowExclude: any[] = []

    this.filterCards().forEach(fCard => {
      // if it is a successor or a parent, mark it to disallow exclude
      const fCardSuc = FilterCardModel.getSuccessor(fCard.props)
      if (fCardSuc) {
        disallowExclude.push(this.getFilterCardByCardId(fCardSuc))
      }

      const fCardPar = fCard.getParentInteraction()
      if (fCardPar) {
        disallowExclude.push(this.getFilterCardByCardId(fCardPar))
      }

      const fCardTime = fCard.advancedTimeLayout.getModel('timeFilterModel').getData().timeFilters
      if (fCardTime && fCardTime.length > 0) {
        for (let i = 0; i < fCardTime.length; i += 1) {
          if (fCard.advancedTimeLayout.getModel('timeFilterModel').getData().timeFilters[i].targetInteraction) {
            disallowExclude.push(
              this.getFilterCardByCardId(
                fCard.advancedTimeLayout.getModel('timeFilterModel').getData().timeFilters[i].targetInteraction
              )
            )
          }
        }
      }
    })

    this.filterCards().forEach(fCard => {
      if (disallowExclude.indexOf(fCard) < 0) {
        if (!fCard.getAllowExcludeOption()) {
          fCard.setAllowExcludeOption(true)
        }
      } else {
        if (fCard.getExcludeFilter()) {
          fCard.setExcludeFilter(false)
        }
        if (fCard.getAllowExcludeOption()) {
          fCard.setAllowExcludeOption(false)
        }
      }
    })

    // consistency check. Check if any other card has the same succesor pointer

    if (!currId) {
      return
    }

    this.filterCards().forEach(fCard => {
      if (fCard !== filterCard) {
        if (FilterCardModel.getSuccessor(fCard.props) === FilterCardModel.getSuccessor(filterCard.props)) {
          const succConst = fCard.getConstraintForAttribute('_succ')
          if (succConst) {
            // succConst.setValueState(sap.ui.core.ValueState.Error);
            succConst.setValueState('ERROR')
            succConst.setSelectedKey('')
          }
        }
      }
    })
  }

  public checkParentNextCycle(filterCard, referenceID) {
    if (filterCard.props.cardId === referenceID) {
      return true
    }

    const nextInteraction = FilterCardModel.getSuccessor(filterCard.props)
    if (nextInteraction && this.checkParentNextCycle(this.getFilterCardByCardId(nextInteraction), referenceID)) {
      return true
    }

    const parentInteraction = filterCard.getParentInteraction()
    if (parentInteraction && this.checkParentNextCycle(this.getFilterCardByCardId(parentInteraction), referenceID)) {
      return true
    }

    return false
  }
  /**
   * Create the Add FilterCard Menu.
   * If the Container is an all-container, the Menu includes an entry for the Basic Data FilterCard.
   * @private
   */
  public createAddFilterCardMenu() {
    const aMenuItems: any[] = []
    let oMenuItem

    // first add patient attributes a.k.a. basic data
    if (this.props.allContainer) {
      oMenuItem = {
        text: 'MRI_PA_FILTERCARD_TITLE_BASIC_DATA',
        key: 'patient',
      }
      aMenuItems.push(oMenuItem)
    }

    this.mriFrontendConfig.getFilterCards().forEach(oFilterCardConfig => {
      if (!oFilterCardConfig.isBasicData()) {
        oMenuItem = {
          text: oFilterCardConfig.getName(),
          key: oFilterCardConfig.getConfigPath(),
        }
        aMenuItems.push(oMenuItem)
      }
    })

    this.props.oAddFilterCardMenu = {
      items: aMenuItems,
      // itemSelect: [this._onAddFilterCardMenuItemSelected, this],
    }
    // this._oAddFilterCardButton.addDependent(this.props.oAddFilterCardMenu);
  }

  /**
   * Handler for Add FilterCard Menu selection.
   * Create a new FilterCard based on the selection.
   * @param {sap.ui.base.Event} oEvent Menu itemSelected Event
   */
  public _onAddFilterCardMenuItemSelected(oEvent) {
    const sConfigKey = oEvent.getParameter('item').data('key')
    this.addFilterCard(BoolFilterContainer.createFilterCard(sConfigKey))
    // this.rerender();
  }

  // convenience method, return array of filtercards
  public filterCards() {
    return this.props.filterCards
  }

  public getWidthOfDescriptionColumns() {
    return Math.min(this.props.widthOfLargestDescriptionColumn, this.props.maxWidthOfDescriptionColumns)
  }

  /**
   * Add a FilterCard to this Container.
   * @param {hc.mri.pa.ui.lib.FilterCard} oFilterCard A FilterCard that is not in any Container.
   */
  public addFilterCard(oFilterCard) {
    this.filterCards().push(oFilterCard)

    // oFilterCard.attachChange(this.fireChange, this);

    // oFilterCard.attachSuccessorChanged((oControlEvent) => {
    //   this.checkSuccessorPointers(oControlEvent.getSource());
    //   this.updateFilterCardsOrder();
    // }, this);

    // oFilterCard.attachParentChanged((oControlEvent) => {
    //   this.checkSuccessorPointers(oControlEvent.getSource());
    // }, this);

    // oFilterCard.attachRemove(function (oEvent) {
    //   // Add delay to wait until the FilterCard was destroyed
    //   //jQuery.sap.delayedCall(0, this, this.onRemoveFilterCard,
    //  [oEvent.getParameter('cardId'), oEvent.getSource().getKey(),
    // oEvent.getSource().getIndex()]);
    // }, this);

    // oFilterCard.attachRename(function () {
    //   this.updateFilterCards();
    //   this.fireChange();
    // }, this);

    // oFilterCard.attachNewDescriptionLabelAddedWithWidth((oEvent) => {
    //   const nLabelWidth = oEvent.getParameter('width');

    //   if (nLabelWidth > this.props.widthOfLargestDescriptionColumn) {
    //     this.props.widthOfLargestDescriptionColumn = nLabelWidth;
    //     this.resizeFiltercards();
    //   }
    // }, this);

    oFilterCard.setModel(this.props.filterCardItemModel)

    this.updateFilterCardsOrder()
    // this.fireChange();
  }

  /**
   * Handler for the FilterCard remove envent.
   * Update the successors and parents and reorder the remaining FilterCards.
   * @private
   * @param {string} sRemovedFilterCardId The id of the removed FilterCard.
   * @param {string} sRemovedFilterCardKey The key of the removed FilterCard.
   * @param {integer} iRemovedFilterCardIndex The index of the removed FilterCard.
   */
  public onRemoveFilterCard(sRemovedFilterCardId, sRemovedFilterCardKey, iRemovedFilterCardIndex) {
    this.getParent().releaseFilterCardNumber(sRemovedFilterCardKey, iRemovedFilterCardIndex)

    this.filterCards().forEach(oFilterCard => {
      const oSuccessorConstraint = oFilterCard.getConstraintForAttribute('_succ')
      if (FilterCardModel.getSuccessor(oFilterCard.props) === sRemovedFilterCardId) {
        if (oSuccessorConstraint) {
          oSuccessorConstraint.setSelectedKey('')
        }
      }

      const oParentConstraint = oFilterCard.getConstraintForAttribute('_parentInteraction')
      if (oFilterCard.getParentInteraction() === sRemovedFilterCardId) {
        if (oParentConstraint) {
          oParentConstraint.setSelectedKey('')
        }
      }
    })

    this.updateFilterCardsOrder()
    // this.fireChange();
  }

  public getFilterCardByCardId(cardId) {
    const filterCards = this.filterCards()
    let retval = null
    filterCards.some(element => {
      if (element.props.cardId === cardId) {
        retval = element
        return true
      }
      return false
    })
    return retval
  }

  /**
   * Given a path, the filter card and attribute from the path will be created if doesn't exist.
   * Optionally, some values can be set for the attribute constraint.
   * @param {string}                                 sInteractionInstancePath
   * The path of the interaction.
   * This can be either a generic path or an instance. If the path is generic
   * or the instance doesn't exist,
   * a new instance will be created
   * @param {string}                                 sAttributeKey   The key of the attribute
   * to be created/modified. This is relative to the interaction path
   * @param {string[]}                               aValues         An array of values to be added
   *  to the contraint corresponding to the attribute
   * @param {hc.mri.pa.ui.Utils.valuesMergeMode} mergeMode      The merging strategy, specifying
   * the way the new values should be merged with the existing ones
   * @returns {string} The path of the attribute that was created/modified
   */
  public setFilterValues(sInteractionInstancePath, sAttributeKey, aValues, mergeMode) {
    let oFilterCard = this.getFilterCardById(sInteractionInstancePath)
    if (!oFilterCard) {
      // the filter card doesn't exists, we need to create it first
      oFilterCard = (this as any).createFilterCard(this.mriFrontendConfig.getGenericPath(sInteractionInstancePath))
      this.addFilterCard(oFilterCard)
    }
    oFilterCard.setFilterValues(sAttributeKey, aValues, mergeMode)
    return `${oFilterCard.props.cardId}.attributes.${sAttributeKey}`
  }

  /**
   * This method changes the order of the cards so that a card
   *  always follows its predecessor (if one exists)
   */
  public updateFilterCardsOrder() {
    // This will contain the graph induced on the cards by the successor relationship
    // each node in the graph is keyed with the card id and contains
    // pointers to its successor and predecessor
    const fCardMap = {}

    this.filterCards().forEach(fCard => {
      const id = fCard.props.cardId
      const succ = FilterCardModel.getSuccessor(fCard.props)

      if (!fCardMap[id]) {
        fCardMap[id] = {}
      }

      if (succ) {
        if (!fCardMap[succ]) {
          fCardMap[succ] = {}
        }
        fCardMap[succ].pred = id
        fCardMap[id].succ = succ
      }
    })

    // this array will contain the final ordering of card Ids
    const finalOrder: any[] = []

    const nodes = this.filterCards().map(fCard => {
      fCard.removeStyleClass('MriPaFilterCardWithPredecessor')
      fCard.removeStyleClass('MriPaFilterCardWithSuccessor')
      return fCard.props.cardId
    })

    // algorithm: we find a card with no predecessors and build
    // a chain following the successor pointers, placing
    // the card we thus find in the "final_order" array
    let currNode
    do {
      // pick as curr_node a card with no predecessor and remove it from the "nodes" array
      currNode = null

      nodes.some((id, i) => {
        if (!fCardMap[id].pred) {
          currNode = id
          nodes.splice(i, 1)
          return true
        }
        return false
      })

      if (currNode) {
        // curr_node is a node with no predecessor. We follow the successor chain and add
        // the cards to the final order

        let headNode = currNode
        while (headNode) {
          finalOrder.push(headNode)
          headNode = fCardMap[headNode].succ
        }
      }
    } while (currNode) // terminate when there are no cards without predecessors left

    // finally: remove the cards from the layout and reinsert them
    // according to the order in the "final_order" array
    const newFilterCardsList: any[] = []
    finalOrder.forEach(id => {
      this.props.filterCards.some((card: any) => {
        if (card.props.cardId === id) {
          if (fCardMap[id].pred) {
            card.addStyleClass('MriPaFilterCardWithPredecessor')
          }
          if (fCardMap[id].succ) {
            card.addStyleClass('MriPaFilterCardWithSuccessor')
          }
          newFilterCardsList.push(card)
          return true
        }
        return false
      })
    })

    this.props.filterCards = newFilterCardsList
  }

  public getParent() {
    return this.parent
  }
}
