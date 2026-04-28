import { IsString } from 'npm:class-validator'
import { IMetadataConfigTag } from '../../types.d.ts'

export class MetadataConfigTagDto implements IMetadataConfigTag {
  @IsString()
  name: string
}
