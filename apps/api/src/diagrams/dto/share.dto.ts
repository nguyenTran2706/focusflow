import { IsArray, IsEmail, IsEnum, IsString } from 'class-validator';

export class InviteDiagramCollaboratorsDto {
  @IsArray()
  @IsEmail({}, { each: true })
  emails!: string[];

  @IsEnum(['VIEWER', 'EDITOR'])
  role!: 'VIEWER' | 'EDITOR';
}

export class UpdateDiagramCollaboratorDto {
  @IsEnum(['VIEWER', 'EDITOR'])
  role!: 'VIEWER' | 'EDITOR';
}

export class UpdateDiagramLinkAccessDto {
  @IsEnum(['NONE', 'VIEW', 'EDIT'])
  access!: 'NONE' | 'VIEW' | 'EDIT';
}

export class JoinDiagramByLinkDto {
  @IsString()
  token!: string;
}
