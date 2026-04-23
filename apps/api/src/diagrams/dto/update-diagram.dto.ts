import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateDiagramDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  data?: any;
}
