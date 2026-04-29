import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Length, Matches } from 'class-validator';
import { Sensitive } from '../../common/decorators/sensitive.decorator';

export class ConsoleSignInDto {
  @ApiProperty({ example: 'director@example.gov.ng' })
  @IsEmail()
  @Sensitive()
  email!: string;

  @ApiProperty({ example: 'long-passphrase-please' })
  @IsString()
  @Length(12, 256)
  @Sensitive()
  password!: string;

  @ApiProperty({ example: '123456', description: '6-digit TOTP code (mandatory for director)' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'totp must be 6 digits' })
  @Sensitive()
  totp!: string;

  @ApiProperty({ example: 'web-chrome-2026-04-28' })
  @IsString()
  @Length(1, 64)
  deviceId!: string;
}

export class MobileSignInDto {
  @ApiProperty({ example: '+2348012345678' })
  @IsString()
  @Matches(/^\+\d{10,15}$/, { message: 'phone must be E.164' })
  @Sensitive()
  phone!: string;

  @ApiProperty({ example: '123456', description: '6-digit PIN' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'pin must be 6 digits' })
  @Sensitive()
  pin!: string;

  @ApiProperty({ example: 'android-imei-hash-...' })
  @IsString()
  @Length(8, 128)
  deviceId!: string;
}

export class RefreshDto {
  @ApiProperty()
  @IsString()
  @Length(32, 256)
  refreshToken!: string;

  @ApiProperty()
  @IsString()
  @Length(8, 128)
  deviceId!: string;
}

export class SignOutDto {
  @ApiProperty()
  @IsString()
  @Length(8, 128)
  deviceId!: string;
}

export class TokenResponseDto {
  @ApiProperty() accessToken!: string;
  @ApiProperty() accessExpiresIn!: number;
  @ApiProperty() refreshToken!: string;
  @ApiProperty() refreshExpiresAt!: string;
}

export class SetCredentialsDto {
  @ApiProperty({ description: 'One-time enrolment token issued at user creation' })
  @IsString()
  @Length(40, 100)
  enrolmentToken!: string;

  /** Mobile users supply this. */
  @ApiProperty({ required: false, example: '123456' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{6}$/, { message: 'pin must be 6 digits' })
  @Sensitive()
  pin?: string;

  /** Console users supply password + initial TOTP enrolment proof. */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(12, 256)
  @Sensitive()
  password?: string;

  @ApiProperty({ required: false, description: 'Returned by /auth/totp/enrol' })
  @IsOptional()
  @IsString()
  @Length(16, 64)
  @Sensitive()
  totpSecret?: string;

  @ApiProperty({ required: false, description: '6-digit code generated from the secret above' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{6}$/, { message: 'totp must be 6 digits' })
  @Sensitive()
  totp?: string;
}

export class SetCredentialsResponseDto {
  @ApiProperty() ok!: true;
}

