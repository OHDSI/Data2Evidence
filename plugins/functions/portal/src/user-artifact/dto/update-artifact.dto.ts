import { Type } from 'npm:class-transformer'
import { IsString, ValidateNested } from 'npm:class-validator'

export class UpdateArtifactDto<T> {
  @IsString()
  userId: string

  @IsString()
  id: string

  @ValidateNested()
  @Type(() => Object)
  serviceArtifact: T
}
