import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { TurnstileModule } from '../turnstile/turnstile.module';
import { PublicResponsesController } from './public-responses.controller';
import { ResponsesController } from './responses.controller';
import { ResponsesService } from './responses.service';

@Module({
  imports: [NotificationsModule, TurnstileModule],
  controllers: [ResponsesController, PublicResponsesController],
  providers: [ResponsesService],
  exports: [ResponsesService],
})
export class ResponsesModule {}
