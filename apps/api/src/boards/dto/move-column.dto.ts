import { IsString } from 'class-validator';

export class MoveColumnDto {
  @IsString()
  rank!: string;
}
