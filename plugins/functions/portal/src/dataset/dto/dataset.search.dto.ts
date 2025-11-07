import { IsNotEmpty } from 'npm:class-validator'
import { IDatasetSearchDto } from '../../types.d.ts'

export class DatasetSearchDto implements IDatasetSearchDto {
  @IsNotEmpty()
  tokenDatasetCode: string
}
