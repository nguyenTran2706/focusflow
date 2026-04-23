import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateDiagramDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;
}
