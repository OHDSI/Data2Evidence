import { IsBoolean, IsNotEmpty, IsString, IsUUID } from 'npm:class-validator'
import { INotebookUpdateDto } from '../../types.d.ts'

export class NotebookUpdateDto implements INotebookUpdateDto {
  @IsNotEmpty()
  @IsUUID()
  id: string

  @IsString()
  name: string

  @IsString()
  notebookContent: string

  @IsBoolean()
  isShared: boolean
}
