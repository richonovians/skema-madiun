import { Module } from '@nestjs/common';
import { IkmController } from './ikm.controller';
import { IkmService } from './ikm.service';

@Module({
  controllers: [IkmController],
  providers: [IkmService],
  exports: [IkmService],
})
export class IkmModule {}
