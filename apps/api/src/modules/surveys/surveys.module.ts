import { Module } from '@nestjs/common';
import { IkmModule } from '../ikm/ikm.module';
import { SurveysController } from './surveys.controller';
import { SurveiPemusnahanService } from './survei-pemusnahan.service';
import { SurveysService } from './surveys.service';

@Module({
  imports: [IkmModule],
  controllers: [SurveysController],
  // SurveiPemusnahanService SENGAJA tidak diekspor: ia berjalan sendiri lewat
  // penjadwalnya, dan satu-satunya pemanggil lain adalah controller modul ini.
  providers: [SurveysService, SurveiPemusnahanService],
  exports: [SurveysService],
})
export class SurveysModule {}
