import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, Matches } from 'class-validator';
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
