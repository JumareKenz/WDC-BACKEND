import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  ValidateIf,
} from 'class-validator';
import { Sensitive } from '../../common/decorators/sensitive.decorator';

const ROLES = ['secretary', 'coordinator', 'director'] as const;
type Role = (typeof ROLES)[number];

export class CreateUserDto {
  @ApiProperty({ enum: ROLES }) @IsIn(ROLES) role!: Role;

  @ApiProperty() @IsString() @Length(1, 200) @Sensitive() fullName!: string;

  @ApiProperty({ example: '+2348012345678' })
  @IsString()
  @Matches(/^(\+\d{10,15}|0\d{10})$/, { message: 'phone must be E.164 or Nigerian national' })
  @Sensitive()
  phone!: string;

  @ApiPropertyOptional({ example: 'name@example.gov.ng' })
  @IsOptional()
  @IsEmail()
  @Sensitive()
  email?: string;

  @ApiPropertyOptional({ description: 'Required for coordinator and secretary' })
  @ValidateIf((o: CreateUserDto) => o.role !== 'director')
  @IsUUID()
  lgaId?: string;

  @ApiPropertyOptional({ description: 'Required for secretary' })
  @ValidateIf((o: CreateUserDto) => o.role === 'secretary')
  @IsUUID()
  wardId?: string;
}

export class UpdateUserAssignmentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  lgaId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  wardId?: string;
}

export class UpdateUserDto extends PartialType(CreateUserDto) {}

export class UserResponseDto {
  @ApiProperty() id!: string;
  // The Role union in rls-context.ts includes 'system' (background jobs);
  // the API surface only ever returns user-facing roles.
  @ApiProperty({ enum: ROLES }) role!: 'secretary' | 'coordinator' | 'director' | 'system';
  @ApiProperty() fullName!: string;
  @ApiProperty() phone!: string;
  @ApiPropertyOptional() email?: string | null;
  @ApiPropertyOptional() lgaId?: string | null;
  @ApiPropertyOptional() wardId?: string | null;
  @ApiProperty() status!: 'active' | 'suspended' | 'deleted';
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

export class CreateUserResponseDto extends UserResponseDto {
  @ApiProperty({ description: 'One-time enrolment token; user redeems via /auth/set-credentials' })
  enrolmentToken!: string;

  @ApiProperty() enrolmentExpiresAt!: string;
}

export class ListUsersQueryDto {
  @ApiPropertyOptional({ enum: ROLES })
  @IsOptional()
  @IsIn(ROLES)
  role?: Role;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  lgaId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  wardId?: string;

  @ApiPropertyOptional({ description: 'Cursor (opaque base64) from previous page' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ description: 'Page size (1–100)', default: 25 })
  @IsOptional()
  @IsString()
  limit?: string;
}
