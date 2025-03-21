import { Transform, Type } from 'npm:class-transformer'
import { IsArray, IsEnum, IsIn, IsNotEmpty, IsNumber, IsOptional, ValidateIf, ValidateNested } from 'npm:class-validator'
import { DATASET_RESEARCHER_ROLE, DATASET_SYSTEM_ADMIN_ROLE, DomainRequirement } from '../../common/const.ts'
import { type DatasetQueryRole, IDatasetQueryDto } from '../../types.d.ts'

class NumberFilterDto {
  @IsNumber()
  @Type(() => Number)
  gte: number
  @IsNumber()
  @Type(() => Number)
  lte: number
}

export class DatasetQueryDto implements IDatasetQueryDto {
  // TODO: remove role; dataset.controller.ts is overriding the parameter
  // based on the endpoint
  @IsOptional()
  @IsNotEmpty()
  @IsIn([DATASET_RESEARCHER_ROLE, DATASET_SYSTEM_ADMIN_ROLE])
  role?: DatasetQueryRole

  @IsOptional()
  searchText?: string

  @ValidateIf(o => o.role === 'researcher')
  @ValidateNested()
  @Type(() => NumberFilterDto)
  @IsOptional()
  age?: NumberFilterDto

  @ValidateIf(o => o.role === 'researcher')
  @ValidateNested()
  @Type(() => NumberFilterDto)
  @IsOptional()
  // observationYear
  obsYr?: NumberFilterDto

  @ValidateIf(o => o.role === 'researcher')
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  // minCumulativeObservationMonth
  minObsMth?: number

  @ValidateIf(o => o.role === 'researcher')
  @IsOptional()
  @IsArray()
  @IsEnum(DomainRequirement, { each: true })
  @Transform(({ value }) => value.split(','))
  domains?: DomainRequirement[]
}
