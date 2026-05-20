import { Module } from '@nestjs/common';
import { TelemetryController } from './telemetry.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [TelemetryController],
})
export class ClientTelemetryModule {}