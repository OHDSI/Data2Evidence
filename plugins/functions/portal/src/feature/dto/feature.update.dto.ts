import { IsArray, IsBoolean, IsNotEmpty, ValidateNested } from 'npm:class-validator'
import { Type } from 'npm:class-transformer'
import { IFeatureDto, IFeatureUpdateDto } from '../../types.d.ts'

export class FeatureUpdateDto implements IFeatureUpdateDto {
  @IsArray()
  @ValidateNested()
  @Type(() => FeatureDto)
  features: FeatureDto[]
}

class FeatureDto implements IFeatureDto {
  @IsNotEmpty()
  feature: string

  @IsBoolean()
  isEnabled: boolean
}
