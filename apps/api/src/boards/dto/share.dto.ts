import { IsArray, IsEmail, IsEnum, IsString } from 'class-validator';

export class InviteBoardCollaboratorsDto {
  @IsArray()
  @IsEmail({}, { each: true })
  emails!: string[];

  @IsEnum(['VIEWER', 'EDITOR'])
  role!: 'VIEWER' | 'EDITOR';
}

export class UpdateBoardCollaboratorDto {
  @IsEnum(['VIEWER', 'EDITOR'])
  role!: 'VIEWER' | 'EDITOR';
}

export class UpdateBoardLinkAccessDto {
  @IsEnum(['NONE', 'VIEW', 'EDIT'])
  access!: 'NONE' | 'VIEW' | 'EDIT';
}

export class JoinBoardByLinkDto {
  @IsString()
  token!: string;
}
