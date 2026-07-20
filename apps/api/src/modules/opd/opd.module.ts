import { Module } from '@nestjs/common';
import { OpdController } from './opd.controller';
import { OpdService } from './opd.service';

@Module({
  controllers: [OpdController],
  providers: [OpdService],
  exports: [OpdService],
})
export class OpdModule {}
