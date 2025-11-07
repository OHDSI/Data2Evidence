import { IsOptional } from 'npm:class-validator'
import { IPublicDatasetQueryDto } from '../../types.d.ts'

export class PublicDatasetQueryDto implements IPublicDatasetQueryDto {
  @IsOptional()
  searchText?: string
}
