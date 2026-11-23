// tslint:disable:no-parameter-reassignment
import AdvancedTimeFilterModel from './AdvancedTimeFilterModel'
import ConstraintModel from './ConstraintModel'
import EntityBase from './EntityBase'
import { isParentAttrKey, parentOptionsForCard } from '../parentInteractions'

export default class FilterCardModel extends EntityBase {
  /**
   * Return the successor of this card if one is selected, undefined otherwise
   * @returns {string} Id of the successor
   */
  public static getSuccessor(filterCardProps) {
    const oSuccessorConstraint = FilterCardModel.getConstraintForAttribute(filterCardProps, '_succ')
    if (oSuccessorConstraint) {
      return oSuccessorConstraint.getSelectedKey()
    }
    return null
  }

  public static getParentInteraction({ constraints }): string[] {
    return (constraints || [])
      .filter(constraint => isParentAttrKey(constraint.props.attrKey))
      .map(constraint => constraint.props.value?.value)
      .filter(value => typeof value === 'string' && value.length > 0)
  }

  // check if this card contains a constraint for a given attribute (key)
  public static getConstraintForAttribute({ constraints }, attributeKey) {
    // Transform a potential absolute attribute key to a relative one
    attributeKey = attributeKey.substr(attributeKey.lastIndexOf('.') + 1)
    if (!constraints) {
      return null
    }
    if (attributeKey === 'time') {
      return FilterCardModel.getConstraintForAttribute({ constraints }, '_absTime')
    }
    if (attributeKey === 'relation') {
      return FilterCardModel.getConstraintForAttribute({ constraints }, '_succ')
    }
    for (let i = 0; i < constraints.length; i += 1) {
      if (constraints[i].props.attrKey === attributeKey) {
        return constraints[i]
      }
    }
    return null
  }

  public static createConstraintForAttribute({ key, name, instanceId, cardId }, attributeKey, attributeConfig?) {
    let constraint
    let filter
    switch (attributeKey) {
      case '_absTime':
        constraint = ConstraintModel.createConstraint(
          '_absTime',
          {
            type: 'hc.mri.pa.ui.lib.CDMAttrType.Date',
            name: '{i18n>MRI_PA_FILTERCARD_CONSTRAINT_ABSTIME}',
            cardId: instanceId,
          },
          key
        )
        break
      case '_succ':
        constraint = ConstraintModel.createConstraint(
          '_succ',
          {
            type: 'relation',
            name: '{i18n>MRI_PA_FILTERCARD_CONSTRAINT_SUCCESSOR}',
            cardId: instanceId,
          },
          key
        )

        filter = {
          path: 'key',
          operator: 'sap.ui.model.FilterOperator.NE',
          value: cardId,
        }

        constraint.props.items.push({
          key: '{key}',
          text: '{text}',
          filters: [filter],
        })

        break
      case '_relTime':
        constraint = ConstraintModel.createConstraint(
          '_relTime',
          {
            type: 'legacy-num',
            name: '{i18n>MRI_PA_FILTERCARD_CONSTRAINT_RELTIME}',
            cardId: instanceId,
            lower: 1,
          },
          key
        )
        break
      default:
        constraint = ConstraintModel.createConstraint(
          attributeKey,
          {
            type: attributeConfig.getType(),
            name: attributeConfig.getName(),
            cardId: instanceId,
            domainFilter: attributeConfig.getDomainFilter(),
            standardConceptCodeFilter: attributeConfig.getStandardConceptCodeFilter(),
          },
          key
        )
    }

    return constraint
  }

  public static createParentConstraint(
    { key, instanceId },
    option: { attrKey: string; label: string; parentPath: string }
  ) {
    return ConstraintModel.createConstraint(
      option.attrKey,
      {
        type: 'parentInteraction',
        name: option.label,
        cardId: instanceId,
        parents: [option.parentPath],
      },
      key
    )
  }

  public props: any
  public mriFrontendConfig: any
  public declare id: any

  constructor(mriFrontendConfig, newProps) {
    super()
    const defaultProps = {
      type: 'filtercard',
      key: '',
      name: '',
      title: '',
      index: 0,
      op: 'OR', // conditional operator used between self and its neighbor FilterCard
      allowExcludeOption: false, // TODO: remove any checks based on allowExcludeOption
      allowTimeConstraint: true,
      allowSuccessorConstraint: false,
      allowParentConstraint: false,
      allowAdvancedTimeFilter: false,
      excludeFilter: false,
      inactive: false,
      advancedTimeFilter: false,
      isEntry: false,
      isExit: false,
      descriptionColumnsWidth: 0,
      layout: {},
      model: {
        // from boolfiltercontainer
      },
      style: '',
      instanceId: '',
      cardId: '',
      filterCardConfig: {},
      constraints: [],
      mConstraints: {},
      titleBar: {},
    }
    this.props = { ...defaultProps, ...newProps }
    this.mriFrontendConfig = mriFrontendConfig
    this.props.instanceId = `${this.props.key}${this.props.index ? `.${this.props.index}` : ''}`
    this.props.cardId = `${this.props.key}${this.props.index ? `.${this.props.index}` : ''}`
    this.id = this.props.cardId
    this.props.filterCardConfig = this.getOwnConfig()
    this.props.layout = this.buildLayout()
    return this
  }

  public init() {
    this.props.descriptionColumnsWidth = 0
  }

  public reinit() {
    this.props.constraints = []
    this.props.mConstraints = {}
    this.addDefaultConstraints()
    return this
  }

  // construct the basic layout including title bar
  public buildLayout() {
    return {
      excludedRow: {
        // add "Excluded" label
        excludedLabel: {
          text: '{i18n>MRI_PA_LABEL_EXCLUDED}',
          visible: false,
          width: '100%',
          textAlign: 'sap.ui.core.TextAlign.Left',
          style: 'MriPaFilterCardExcluded',
        },
      },
      timeConstraintLayout: {
        style: 'MriPaTimeConstraintLayout',
        constraints: [],
      },
      constraintLayout: {
        constraints: [],
      },
      advancedTimeLayout: new AdvancedTimeFilterModel({
        visible: false,
        filterCardId: this.props.cardId,
        filterCardName: this.props.name,
      }),
    }
  }

  public getOwnConfig() {
    if (this.props.key) {
      return this.mriFrontendConfig.getFilterCardByPath(this.props.key)
    }
    return null
  }

  // adds a new constraint control to the card
  public addConstraint(constraint, pos) {
    constraint.parentId = this.id
    this.props.constraints.push(constraint)

    if (!pos) {
      pos = 0
    }

    switch (pos) {
      case 0: // add as last constraint below the title bar
      default:
        this.props.layout.constraintLayout.constraints.push(constraint)
        break
      case 1: // add as first contraint below the title bar
        this.props.layout.constraintLayout.constraints.unshift(constraint)
        // this._constraintLayout.insertItem(constraint, 0);
        break
      case 2: // add as time layout constraint (Always bottom, special color handling)
        this.props.layout.timeConstraintLayout.constraints.push(constraint)
        // this._timeConstraintLayout.addItem(constraint);
        break
    }
  }

  public addDefaultConstraints() {
    this.getOwnConfig()
      .getFilterAttributes()
      .forEach(oneAttrConfig => {
        if (oneAttrConfig.isInitialInFilterCard()) {
          this.addConstraint(
            ConstraintModel.createConstraint(
              oneAttrConfig.getConfigKey(),
              {
                type: oneAttrConfig.getType(),
                name: oneAttrConfig.getName(),
                cardId: this.props.instanceId,
                domainFilter: oneAttrConfig.getDomainFilter(),
                standardConceptCodeFilter: oneAttrConfig.getStandardConceptCodeFilter(),
              },
              this.props.key
            ),
            null
          )
        }
      })
  }

  public getKey() {
    return this.props.key
  }

  public getName() {
    return this.props.name
  }

  public getAllowSuccessorConstraint() {
    return this.props.allowSuccessorConstraint
  }

  public getAllowAdvancedTimeFilter() {
    return this.props.allowAdvancedTimeFilter
  }

  public getAllowParentConstraint() {
    return this.props.allowParentConstraint
  }

  public setModel(model) {
    this.props.model = model
  }

  public removeStyleClass(style) {
    this.props.style.replace(style, '')
  }

  public addConstraintForAttribute(attributeKey) {
    // Transform a potential absolute attribute key to a relative one
    let attributeConfig
    const constraints: any[] = []

    attributeKey = attributeKey.substr(attributeKey.lastIndexOf('.') + 1)
    if (isParentAttrKey(attributeKey)) {
      return this.addParentField(attributeKey)
    }
    if (!FilterCardModel.getConstraintForAttribute(this.props, attributeKey)) {
      switch (attributeKey) {
        case 'time':
          constraints.push({
            constraint: FilterCardModel.createConstraintForAttribute(this.props, '_absTime'),
            pos: null,
            visible: true,
          })
          break
        case 'relation':
          constraints.push({
            constraint: FilterCardModel.createConstraintForAttribute(this.props, '_succ'),
            pos: 2,
            visible: true,
          })
          constraints.push({
            constraint: FilterCardModel.createConstraintForAttribute(this.props, '_relTime'),
            pos: 2,
            visible: true,
          })
          break
        case '_absTime':
          constraints.push({
            constraint: FilterCardModel.createConstraintForAttribute(this.props, '_absTime'),
            pos: null,
            visible: true,
          })
          break
        default:
          attributeConfig = this.getOwnConfig().getAttributeByRelativeKey(attributeKey)
          constraints.push({
            constraint: FilterCardModel.createConstraintForAttribute(this.props, attributeKey, attributeConfig),
          })
      }

      constraints.forEach(({ constraint, pos }) => {
        this.addConstraint(constraint, pos)
      })
      return constraints.map(item => item.constraint)
    }
    return []
  }

  public getParentOptions() {
    return parentOptionsForCard(this.mriFrontendConfig, this.props.key)
  }

  public addParentField(attrKey: string, value?: string) {
    const option = this.getParentOptions().find(o => o.attrKey === attrKey)
    if (!option || FilterCardModel.getConstraintForAttribute(this.props, attrKey)) {
      return []
    }
    const constraint = FilterCardModel.createParentConstraint(this.props, option)
    if (value) {
      constraint.addExpression('=', value)
    }
    this.addConstraint(constraint, null)
    return [constraint]
  }

  public removeConstraintForAttributeKey(attributeKey) {
    if (attributeKey === 'time') {
      this.removeConstraint(FilterCardModel.getConstraintForAttribute(this.props, '_absTime'))
    } else if (attributeKey === 'relation') {
      this.removeConstraint(FilterCardModel.getConstraintForAttribute(this.props, '_succ'))
      this.removeConstraint(FilterCardModel.getConstraintForAttribute(this.props, '_relTime'))
    } else {
      this.removeConstraint(FilterCardModel.getConstraintForAttribute(this.props, attributeKey))
    }
  }

  public removeConstraintLayout(oConstraint) {
    this.props.layout.constraintLayout.constraints = this.props.layout.constraintLayout.constraints.filter(
      element => element.attributeId !== oConstraint.attributeId
    )
  }

  public removeConstraint(oConstraint) {
    this.props.constraints = this.props.constraints.filter(element => element.attributeId !== oConstraint.attributeId)

    this.removeConstraintLayout(oConstraint)
  }

  public removeAllConstraints() {
    this.props.constraints = []
  }

  public setAdvancedTimeFilterModel(timeFilterDataRequest) {
    const advancedTimeProps = AdvancedTimeFilterModel.createAdvancedTimeFilterModel(timeFilterDataRequest)
    this.props.layout.advancedTimeLayout.props = {
      ...this.props.layout.advancedTimeLayout.props,
      ...advancedTimeProps,
    }
  }

  public setExcludeFilter(isExcluded: boolean) {
    this.props.excludeFilter = isExcluded
  }

  public setIsEntry(isEntry: boolean) {
    this.props.isEntry = isEntry
  }

  public setIsExit(isExit: boolean) {
    this.props.isExit = isExit
  }
}
