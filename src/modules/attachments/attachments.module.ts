import { Module } from '@nestjs/common';
import { AttachmentsController } from './attachments.controller';
import { AttachmentsService } from './attachments.service';
import { StorageModule } from '../../infra/storage/storage.module';
import { QueueModule } from '../../infra/queue/queue.module';
import { OcrProcessor } from './processors/ocr.processor';
import { AsrProcessor } from './processors/asr.processor';

@Module({
  imports: [StorageModule, QueueModule],
  controllers: [AttachmentsController],
  providers: [AttachmentsService, OcrProcessor, AsrProcessor],
  exports: [AttachmentsService, OcrProcessor, AsrProcessor],
})
export class AttachmentsModule {}
