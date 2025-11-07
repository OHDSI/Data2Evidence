import { Injectable } from '@danet/core'
import { ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from 'npm:class-validator'
import { ATTRIBUTE_CONFIG_DATA_TYPES } from '../../common/const.ts'
import { IDatasetAttribute } from '../../types.d.ts'
import { DatasetAttributeConfigRepository } from '../repository/index.ts'

@ValidatorConstraint({ async: true })
@Injectable()
export class IsDatasetAttributeValueValid implements ValidatorConstraintInterface {
  private attributeConfigs
  constructor(private readonly metadataConfigRepo: DatasetAttributeConfigRepository) { }

  async validate(value: string, validationArguzments?: ValidationArguments): Promise<boolean> {
    const obj = validationArguzments.object as IDatasetAttribute
    this.attributeConfigs = await this.metadataConfigRepo.getAttributeConfigs()
    const attributeConfig = this.attributeConfigs.find(attributeConfig => attributeConfig.id === obj.attributeId)

    if (!attributeConfig) {
      return false
    }

    switch (attributeConfig.dataType) {
      case ATTRIBUTE_CONFIG_DATA_TYPES.NUMBER:
        return !isNaN(Number(value))
      case ATTRIBUTE_CONFIG_DATA_TYPES.STRING:
        return true
      case ATTRIBUTE_CONFIG_DATA_TYPES.TIMESTAMP:
        return !isNaN(Date.parse(value))
    }

    return false
  }
  defaultMessage(validationArguzments: ValidationArguments) {
    const obj = validationArguzments.object as IDatasetAttribute
    const attributeConfig = this.attributeConfigs.find(attributeConfig => attributeConfig.id === obj.attributeId)

    if (!attributeConfig) {
      return `${obj.attributeId} is not a valid attributeId`
    } else {
      return `${validationArguzments.value} is not a valid ${attributeConfig.dataType}`
    }
  }
}
