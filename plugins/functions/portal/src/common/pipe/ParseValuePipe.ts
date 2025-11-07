import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common'

interface ParseValuePipeOptions {
  allowedValues: string[]
  isOptional?: boolean
}

@Injectable()
export class ParseValuePipe implements PipeTransform {
  private readonly options: ParseValuePipeOptions
  constructor(options: ParseValuePipeOptions) {
    this.options = options
  }
  transform(value: any, _metadata: ArgumentMetadata) {
    const { allowedValues, isOptional } = this.options
    if (isOptional || value in allowedValues) {
      return value
    }
    throw new BadRequestException(`Invalid param: ${value}`)
  }
}
