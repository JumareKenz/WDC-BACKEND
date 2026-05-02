import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuditService } from './audit.service';
import { AnchorService } from './anchor.service';
import { AuditController } from './audit.controller';

@Global()
@Module({
  imports: [ConfigModule],
  controllers: [AuditController],
  providers: [AuditService, AnchorService],
  exports: [AuditService, AnchorService],
})
export class AuditModule {}
