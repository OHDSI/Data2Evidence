import { IsNotEmpty, IsString } from "npm:class-validator";

export class LogUserAcceptanceDto {
  @IsNotEmpty()
  @IsString()
  response: string;
}
