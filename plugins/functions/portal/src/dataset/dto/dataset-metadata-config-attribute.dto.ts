import { IsBoolean, IsIn, IsString, Matches } from 'npm:class-validator'
import { ATTRIBUTE_CONFIG_CATEGORIES, ATTRIBUTE_CONFIG_DATA_TYPES } from '../../common/const.ts'
import { IMetadataConfigAttribute } from '../../types.d.ts'

export class MetdataConfigAttributeDto implements IMetadataConfigAttribute {
  @IsString()
  @Matches(/^[a-z0-9]+(_[a-z0-9]+)*$/, {
    message: 'id can only contain lower case letters or numbers, and be in snake case'
  })
  id: string

  @IsString()
  name: string

  @IsString()
  @IsIn(Object.values(ATTRIBUTE_CONFIG_CATEGORIES))
  category: keyof typeof ATTRIBUTE_CONFIG_CATEGORIES

  @IsString()
  @IsIn(Object.values(ATTRIBUTE_CONFIG_DATA_TYPES))
  dataType: keyof typeof ATTRIBUTE_CONFIG_DATA_TYPES

  @IsBoolean()
  isDisplayed: boolean
}
