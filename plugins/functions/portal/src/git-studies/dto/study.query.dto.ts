import { IsNotEmpty, IsString } from 'npm:class-validator'
import { IGitStudiesQueryDto } from '../../types.d.ts'

export class GitStudiesQueryDto implements IGitStudiesQueryDto {
  @IsNotEmpty()
  @IsString()
  studyId: string
}
