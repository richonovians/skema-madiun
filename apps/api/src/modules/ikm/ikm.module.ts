import { Module } from '@nestjs/common';
import { IkmController } from './ikm.controller';
import { IkmExportService } from './ikm-export.service';
import { IkmService } from './ikm.service';

@Module({
  controllers: [IkmController],
  providers: [IkmService, IkmExportService],
  exports: [IkmService],
})
export class IkmModule {}
