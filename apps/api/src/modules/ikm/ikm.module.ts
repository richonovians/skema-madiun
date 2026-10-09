import { Module } from '@nestjs/common';
import { SinggahanModule } from '../../common/cache/singgahan.module';
import { IkmController } from './ikm.controller';
import { IkmExportService } from './ikm-export.service';
import { IkmService } from './ikm.service';

@Module({
  imports: [SinggahanModule],
  controllers: [IkmController],
  providers: [IkmService, IkmExportService],
  exports: [IkmService],
})
export class IkmModule {}
