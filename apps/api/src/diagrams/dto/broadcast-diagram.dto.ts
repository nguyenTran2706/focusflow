import { IsOptional, IsString } from 'class-validator';

export class BroadcastDiagramDto {
  @IsOptional()
  nodes?: any;

  @IsOptional()
  edges?: any;

  @IsOptional()
  viewport?: any;

  @IsString()
  clientId!: string;
}
