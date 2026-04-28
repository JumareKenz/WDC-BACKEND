import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ArgonService } from './argon.service';
import { TotpService } from './totp.service';
import { TokenService } from './token.service';

@Module({
  imports: [ConfigModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, ArgonService, TotpService, TokenService],
  exports: [TokenService, ArgonService, TotpService],
})
export class AuthModule {}
