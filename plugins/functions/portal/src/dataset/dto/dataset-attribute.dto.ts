import { IsNotEmpty, IsString, IsUUID, Validate } from 'npm:class-validator'
import { IDatasetAttributeDto } from '../../types.d.ts'
import { IsDatasetAttributeValueValid } from '../validator/dataset-attribute.validator.ts'

export class DatasetAttributeDto implements IDatasetAttributeDto {
  @IsNotEmpty()
  @IsUUID()
  studyId: string

  @IsString()
  attributeId: string

  @IsString()
  @Validate(IsDatasetAttributeValueValid)
  value: string
}
