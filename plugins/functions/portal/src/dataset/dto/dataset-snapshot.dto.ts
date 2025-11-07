import { Transform } from 'npm:class-transformer'
import { IsDate, IsNotEmpty, IsString, IsUUID } from 'npm:class-validator'
import { IDatasetSnapshotDto } from '../../types.d.ts'

export class DatasetSnapshotDto implements IDatasetSnapshotDto {
  @IsUUID()
  id: string

  @IsUUID()
  sourceDatasetId: string

  @IsNotEmpty()
  @IsString()
  newDatasetName: string

  @IsNotEmpty()
  @IsString()
  schemaName: string

  @Transform(({ value }) => new Date(value))
  @IsDate()
  timestamp: Date
}
