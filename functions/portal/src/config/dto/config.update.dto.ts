import { IsNotEmpty, IsString } from 'npm:class-validator'
import { IConfigUpdateDto } from '../../types.d.ts'

export class ConfigUpdateDto implements IConfigUpdateDto {
  @IsNotEmpty()
  type: string

  @IsString()
  value: string
}
