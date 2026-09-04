import { Module } from '@nestjs/common';
import { PublicResponsesController } from './public-responses.controller';
import { ResponsesController } from './responses.controller';
import { ResponsesService } from './responses.service';

@Module({
  controllers: [ResponsesController, PublicResponsesController],
  providers: [ResponsesService],
  exports: [ResponsesService],
})
export class ResponsesModule {}
