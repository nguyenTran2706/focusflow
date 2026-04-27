import { IsString, IsNumber, IsOptional, IsArray, IsObject } from 'class-validator';

export class BoardInsightsDto {
  @IsString()
  boardName!: string;

  @IsNumber()
  totalCards!: number;

  @IsObject()
  statusCounts!: Record<string, number>;

  @IsObject()
  priorityCounts!: Record<string, number>;

  @IsObject()
  typeCounts!: Record<string, number>;

  @IsNumber()
  completedRecently!: number;

  @IsNumber()
  createdRecently!: number;

  @IsNumber()
  dueSoon!: number;

  @IsOptional()
  @IsNumber()
  avgVelocity?: number;

  @IsOptional()
  @IsArray()
  recentActivity?: { title: string; columnName: string; updatedAt: string }[];
}
