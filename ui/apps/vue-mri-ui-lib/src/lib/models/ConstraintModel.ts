import Constants from '../../utils/Constants'
import ConceptSetConstraintModel from './ConceptSetConstraintModel'
import ConstraintBase from './ConstraintBase'
import DateConstraintModel from './DateConstraintModel'
import DateTimeConstraintModel from './DateTimeConstraintModel'
import DomainConstraintModel from './DomainConstraintModel'
import LegacyRangeConstraintModel from './LegacyRangeConstraintModel'
import RangeConstraintModel from './RangeConstraintModel'
import SingleSelectionConstraintModel from './SingleSelectionConstraintModel'

export default class ConstraintModel extends ConstraintBase {
  public static mriFrontendConfig: any

  public static createConstraint(
    key,
    params: {
      type: string
      name: string
      values?: any
      cardId: string
      lower?: any
      upper?: any
      parents?: string[]
      items?: object
      domainFilter?: string
      standardConceptCodeFilter?: string
    },
    parentKey
  ): ConstraintModel {
    let newconstr: any = null

    const mSettings = {
      attributePath: `${parentKey}.attributes.${key}`,
      name: params.name,
      instanceId: `${params.cardId}.attributes.${key}`,
      domainFilter: params.domainFilter,
      standardConceptCodeFilter: params.standardConceptCodeFilter,
    }

    if (params.type === Constants.CDMAttrType.Text) {
      newconstr = new DomainConstraintModel(this.mriFrontendConfig, mSettings)

      if (params.values) {
        newconstr.setValues(params.values)
      }
    } else if (params.type === Constants.CDMAttrType.Number) {
      newconstr = new RangeConstraintModel(this.mriFrontendConfig, mSettings)

      let oFilterObject
      if (params.lower || params.upper) {
        if (params.lower && params.upper) {
          oFilterObject = {
            and: [
              {
                op: '>=',
                value: params.lower,
              },
              {
                op: '<=',
                value: params.upper,
              },
            ],
          }
        } else if (params.lower) {
          oFilterObject = {
            op: '>=',
            value: params.lower,
          }
        } else {
          oFilterObject = {
            op: '<=',
            value: params.upper,
          }
        }

        newconstr.applyFilterObject({
          filter: [oFilterObject],
        })
      }
    } else if (params.type === 'legacy-num') {
      newconstr = new LegacyRangeConstraintModel(this.mriFrontendConfig, mSettings)

      if (params.lower) {
        newconstr.setLower(params.lower)
      }
      if (params.upper) {
        newconstr.setUpper(params.upper)
      }
    } else if (params.type === Constants.CDMAttrType.Datetime) {
      newconstr = new DateTimeConstraintModel(this.mriFrontendConfig, mSettings)

      if (params.lower) {
        newconstr.setLower(params.lower)
      }
      if (params.upper) {
        newconstr.setUpper(params.upper)
      }
    } else if (params.type === Constants.CDMAttrType.Date) {
      newconstr = new DateConstraintModel(this.mriFrontendConfig, mSettings)

      if (params.lower) {
        newconstr.setLower(params.lower)
      }
      if (params.upper) {
        newconstr.setUpper(params.upper)
      }
    } else if (params.type === 'relation') {
      // newconstr = new hc.mri.pa.ui.lib.SingleSelectionConstraint(mSettings);
    } else if (params.type === 'parentInteraction') {
      newconstr = new SingleSelectionConstraintModel(this.mriFrontendConfig, {
        dataSource: 'parents',
        ...mSettings,
      })
      newconstr.props.parents = params.parents || []
    } else if (params.type === 'conceptSet') {
      newconstr = new ConceptSetConstraintModel(this.mriFrontendConfig, mSettings)

      if (params.values) {
        newconstr.setValues(params.values)
      }
    } else {
      throw new Error(`Attribute type ${params.type} is not supported`)
    }
    newconstr.id = mSettings.instanceId
    return newconstr
  }
  constructor(mriFrontendConfig, newProps) {
    super(mriFrontendConfig, newProps)

    this.mriFrontendConfig = mriFrontendConfig
    const defaultProps = {
      type: 'constraint',
    }
    this.props = { ...defaultProps, ...newProps }
  }
}
