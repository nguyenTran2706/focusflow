import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateWhiteboardDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;
}
