import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuditModule } from './modules/audit/audit.module';
import { UsersModule } from './modules/users/users.module';
import { FormsModule } from './modules/forms/forms.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SyncModule } from './modules/sync/sync.module';
import { PostgresModule } from './infra/postgres/postgres.module';
import { RedisModule } from './infra/redis/redis.module';
import { StorageModule } from './infra/storage/storage.module';
import { QueueModule } from './infra/queue/queue.module';
import { AttachmentsModule } from './modules/attachments/attachments.module';
import { InvestigationsModule } from './modules/investigations/investigations.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { AiModule } from './modules/ai/ai.module';
import { ClientTelemetryModule } from './modules/telemetry/telemetry.module';
import { TelemetryModule } from './infra/telemetry/telemetry.module';
import { MetricsMiddleware } from './infra/telemetry/metrics.middleware';
import { RequestIdMiddleware, REQUEST_ID_HEADER } from './common/logger/request-id.middleware';
import { JwtAuthGuard } from './common/auth/jwt-auth.guard';
import { RolesGuard } from './common/auth/roles.guard';
import { PoolBackpressureInterceptor } from './common/interceptors/pool-backpressure.interceptor';
import { loadConfig } from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [loadConfig],
      cache: true,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        genReqId: (req, res) => {
          const incoming = req.headers[REQUEST_ID_HEADER.toLowerCase()];
          const id = typeof incoming === 'string' && incoming.length > 0 ? incoming : randomUUID();
          res.setHeader(REQUEST_ID_HEADER, id);
          return id;
        },
        customProps: () => ({ service: 'wdc-backend' }),
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.body.password',
            'req.body.pin',
            'req.body.token',
            '*.phone',
            '*.email',
          ],
          censor: '[redacted]',
        },
        transport:
          process.env.NODE_ENV === 'production'
            ? undefined
            : {
                target: 'pino-pretty',
                options: { singleLine: true, colorize: true, translateTime: 'SYS:HH:MM:ss.l' },
              },
      },
    }),
    PostgresModule,
    RedisModule,
    StorageModule,
    QueueModule,
    AuditModule,
    AuthModule,
    UsersModule,
    FormsModule,
    ReportsModule,
    SyncModule,
    AttachmentsModule,
    InvestigationsModule,
    MessagingModule,
    AiModule,
    ClientTelemetryModule,
    TelemetryModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: PoolBackpressureInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware, MetricsMiddleware).forRoutes('*');
  }
}
