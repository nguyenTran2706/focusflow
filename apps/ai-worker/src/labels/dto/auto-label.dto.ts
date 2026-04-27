import { IsString, IsOptional, IsArray } from 'class-validator';

export class AutoLabelDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  existingLabels?: string[];
}
