import { Transform } from 'npm:class-transformer'
import { IsDate, IsNotEmpty } from 'npm:class-validator'
import { IDatasetReleaseDto } from '../../types.d.ts'

export class DatasetReleaseDto implements IDatasetReleaseDto {
  @IsNotEmpty()
  datasetId: string

  @IsNotEmpty()
  name: string

  @Transform(({ value }) => new Date(value))
  @IsDate()
  @IsNotEmpty()
  releaseDate: Date
}
