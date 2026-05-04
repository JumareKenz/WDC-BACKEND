import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { Logger } from '@nestjs/common';

@ApiTags('telemetry')
@Controller('api/v1/telemetry')
export class TelemetryController {
  private readonly logger = new Logger(TelemetryController.name);

  @Post()
  @UseGuards(JwtAuthGuard)
  logClientEvent(
    @Body() body: { level: string; message: string; metadata?: Record<string, unknown> },
    @Req() req: { user: { userId: string; role: string } },
  ) {
    const { level, message, metadata } = body;

    const logEntry = {
      timestamp: new Date().toISOString(),
      userId: req.user.userId,
      role: req.user.role,
      level,
      message,
      ...metadata,
    };

    switch (level) {
      case 'error':
        this.logger.error(JSON.stringify(logEntry));
        break;
      case 'warn':
        this.logger.warn(JSON.stringify(logEntry));
        break;
      case 'debug':
        this.logger.debug(JSON.stringify(logEntry));
        break;
      default:
        this.logger.log(JSON.stringify(logEntry));
    }

    return { ok: true };
  }
}