import { Module } from '@nestjs/common';
import { IkmModule } from '../ikm/ikm.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [IkmModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
