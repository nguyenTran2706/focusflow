import { IsArray, IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';

export class InviteCollaboratorsDto {
  @IsArray()
  @IsEmail({}, { each: true })
  emails!: string[];

  @IsEnum(['VIEWER', 'EDITOR'])
  role!: 'VIEWER' | 'EDITOR';
}

export class UpdateCollaboratorDto {
  @IsEnum(['VIEWER', 'EDITOR'])
  role!: 'VIEWER' | 'EDITOR';
}

export class UpdateLinkAccessDto {
  @IsEnum(['NONE', 'VIEW', 'EDIT'])
  access!: 'NONE' | 'VIEW' | 'EDIT';
}

export class JoinByLinkDto {
  @IsString()
  token!: string;
}

export class AcceptInvitationDto {
  @IsOptional()
  @IsString()
  token?: string;
}
