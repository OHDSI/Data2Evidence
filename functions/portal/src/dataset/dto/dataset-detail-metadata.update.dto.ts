import { Type } from 'npm:class-transformer'
import { IsArray, IsNotEmpty, IsNotEmptyObject, IsUUID, ValidateNested } from 'npm:class-validator'
import { IDatasetDetailMetadataUpdateDto } from '../../types.d.ts'
import { DatasetCustomAttribute, DatasetDashboardBaseDto, DatasetDetailDto } from './dataset.dto.ts'

export class DatasetDetailMetadataUpdateDto implements IDatasetDetailMetadataUpdateDto {
  @IsNotEmpty()
  @IsUUID()
  id: string

  @ValidateNested()
  @IsNotEmptyObject()
  @Type(() => DatasetDetailDto)
  detail: DatasetDetailDto

  @ValidateNested()
  @Type(() => DatasetDashboardBaseDto)
  @IsArray()
  dashboards: DatasetDashboardBaseDto[]

  @ValidateNested()
  @Type(() => DatasetCustomAttribute)
  @IsArray()
  attributes: DatasetCustomAttribute[]

  @IsArray()
  tags: string[]

  @IsNotEmpty()
  tokenDatasetCode: string

  type?: string

  @IsNotEmpty()
  visibilityStatus: string

  @IsNotEmpty()
  @IsUUID()
  paConfigId: string

  @IsUUID()
  fhir_project_id?: string
}
