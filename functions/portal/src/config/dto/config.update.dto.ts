// import { IsNotEmpty, IsString } from 'npm:class-validator'
import { IsNotEmpty, IsString } from '@danet/validatte'
import { IConfigUpdateDto } from '../../types.d.ts'

export class ConfigUpdateDto implements IConfigUpdateDto {
  @IsNotEmpty()
  type: string

  @IsString()
  value: string
}
