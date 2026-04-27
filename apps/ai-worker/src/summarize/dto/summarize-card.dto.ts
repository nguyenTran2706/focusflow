import { IsString, IsOptional, IsArray } from 'class-validator';

export class SummarizeCardDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  comments?: string[];
}

export class SummarizeBoardDto {
  @IsString()
  boardName!: string;

  @IsArray()
  columns!: {
    name: string;
    cards: { title: string; priority?: string; assignee?: string; storyPoints?: number }[];
  }[];
}
