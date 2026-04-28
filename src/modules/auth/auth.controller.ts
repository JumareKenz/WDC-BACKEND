import { Body, Controller, HttpCode, Inject, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { Public } from '../../common/auth/public.decorator';
import { JwtAuthGuard, type AuthedRequest } from '../../common/auth/jwt-auth.guard';
import {
  ConsoleSignInDto,
  MobileSignInDto,
  RefreshDto,
  SignOutDto,
  TokenResponseDto,
} from './auth.dto';
import { TokenService, type TokenPair } from './token.service';

function reqId(req: Request): string | null {
  const v = (req as Request & { requestId?: string }).requestId;
  return typeof v === 'string' ? v : null;
}

function toResponse(pair: TokenPair): TokenResponseDto {
  return {
    accessToken: pair.accessToken,
    accessExpiresIn: pair.accessExpiresIn,
    refreshToken: pair.refreshToken,
    refreshExpiresAt: pair.refreshExpiresAt.toISOString(),
  };
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(TokenService) private readonly tokens: TokenService,
  ) {}

  @Public()
  @Post('sign-in/mobile')
  @HttpCode(200)
  @ApiOperation({ summary: 'Mobile sign-in (phone + PIN)' })
  async mobile(@Body() dto: MobileSignInDto, @Req() req: Request): Promise<TokenResponseDto> {
    const pair = await this.auth.signInMobile({
      phone: dto.phone,
      pin: dto.pin,
      deviceId: dto.deviceId,
      requestId: reqId(req),
    });
    return toResponse(pair);
  }

  @Public()
  @Post('sign-in/console')
  @HttpCode(200)
  @ApiOperation({ summary: 'Console sign-in (email + password + TOTP, director only)' })
  async console(@Body() dto: ConsoleSignInDto, @Req() req: Request): Promise<TokenResponseDto> {
    const pair = await this.auth.signInConsole({
      email: dto.email,
      password: dto.password,
      totp: dto.totp,
      deviceId: dto.deviceId,
      requestId: reqId(req),
    });
    return toResponse(pair);
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Rotate refresh token; returns a fresh access+refresh pair' })
  async refresh(@Body() dto: RefreshDto): Promise<TokenResponseDto> {
    const pair = await this.tokens.rotate({
      presentedToken: dto.refreshToken,
      deviceId: dto.deviceId,
    });
    return toResponse(pair);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('sign-out')
  @HttpCode(200)
  @ApiOperation({ summary: 'Revoke all refresh tokens for the calling device' })
  async signOut(
    @Body() dto: SignOutDto,
    @Req() req: AuthedRequest,
  ): Promise<{ revoked: number }> {
    const user = req.user;
    if (!user) throw new Error('signOut reached without an authenticated user');
    return this.auth.signOut({
      userId: user.sub,
      role: user.role,
      deviceId: dto.deviceId,
      requestId: reqId(req),
    });
  }
}
