import { IsEmail, IsEnum, IsOptional } from 'class-validator';

export enum InviteRole {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

export class InviteToWorkspaceDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsEnum(InviteRole)
  role?: InviteRole = InviteRole.MEMBER;
}
