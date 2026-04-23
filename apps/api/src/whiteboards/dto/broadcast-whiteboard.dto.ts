import { IsOptional, IsString } from 'class-validator';

export class BroadcastWhiteboardDto {
  @IsOptional()
  elements?: any;

  @IsOptional()
  appState?: any;

  @IsString()
  clientId!: string;
}
