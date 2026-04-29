import { Module } from '@nestjs/common';
import { MessagingController } from './messaging.controller';
import { MessagingService } from './messaging.service';
import { BroadcastWorker } from './broadcast.worker';
import { InAppAdapter } from './adapters/in-app.adapter';
import { EmailAdapter } from './adapters/email.adapter';
import { SmsAdapter } from './adapters/sms.adapter';
import { WhatsAppAdapter } from './adapters/whatsapp.adapter';

@Module({
  controllers: [MessagingController],
  providers: [
    MessagingService,
    BroadcastWorker,
    InAppAdapter,
    EmailAdapter,
    SmsAdapter,
    WhatsAppAdapter,
  ],
  exports: [MessagingService],
})
export class MessagingModule {}
