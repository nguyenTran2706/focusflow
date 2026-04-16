import { IsString } from 'class-validator';

export class MoveCardDto {
  @IsString()
  targetColumnId!: string;

  /** Fractional rank string for the new position */
  @IsString()
  rank!: string;
}
