import { IsJSON, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateWhiteboardDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  scene?: any;
}
