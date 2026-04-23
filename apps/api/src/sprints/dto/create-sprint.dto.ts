import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateSprintDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  goal?: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}
