import { Type } from "class-transformer";
import { ValidateNested } from "class-validator";
export class CreateArtifactDto<T> {
  @ValidateNested()
  @Type(() => Object)
  serviceArtifact: T;
}
