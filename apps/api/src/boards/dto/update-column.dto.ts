import { IsOptional, IsString, MinLength, IsInt, Min } from 'class-validator';

export class UpdateColumnDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  wipLimit?: number | null;
}
