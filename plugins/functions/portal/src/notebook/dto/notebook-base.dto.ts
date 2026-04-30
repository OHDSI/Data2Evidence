import { IsNotEmpty, IsString } from 'npm:class-validator'
import { INotebookBaseDto } from '../../types.d.ts'

export class NotebookBaseDto implements INotebookBaseDto {
  @IsNotEmpty()
  @IsString()
  name: string

  notebookContent: string
}
