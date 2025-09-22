import { IsNotEmpty, IsEnum } from "npm:class-validator";
import { UserAcceptanceResponse } from "../const";

export class LogUserAcceptanceDto {
  @IsNotEmpty()
  @IsEnum(UserAcceptanceResponse)
  response: UserAcceptanceResponse;
}
