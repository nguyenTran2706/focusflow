import { IsString, IsNumber, IsOptional, IsArray } from 'class-validator';

export class SprintRetroDto {
  @IsString()
  sprintName!: string;

  @IsOptional()
  @IsString()
  goal?: string;

  @IsNumber()
  totalCards!: number;

  @IsNumber()
  completedCards!: number;

  @IsNumber()
  totalPoints!: number;

  @IsNumber()
  completedPoints!: number;

  @IsNumber()
  durationDays!: number;

  @IsOptional()
  @IsNumber()
  previousVelocity?: number;

  @IsArray()
  completedItems!: { title: string; points?: number; type?: string }[];

  @IsArray()
  incompleteItems!: { title: string; points?: number; type?: string; column?: string }[];
}
