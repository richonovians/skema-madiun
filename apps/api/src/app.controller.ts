import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { HealthEntity } from './app.health.entity';
import { KesiapanEntity } from './app.kesiapan.entity';
import { AppService } from './app.service';
import { Public } from './common/decorators/public.decorator';
import { KesiapanService } from './kesiapan.service';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly kesiapan: KesiapanService,
  ) {}

  // Health check publik untuk memverifikasi aplikasi berjalan: GET /api/v1/health
  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Periksa aplikasi berjalan. Publik, tanpa sesi.' })
  @ApiOkResponse({ type: HealthEntity })
  getHealth(): HealthEntity {
    return new HealthEntity(this.appService.getHealth());
  }

  /**
   * Kesiapan melayani: GET /api/v1/health/siap (BUG-072).
   *
   * `/health` di atas tetap statis dan selalu 200 selagi proses hidup; endpoint
   * ini yang memeriksa basis data dan penyimpan sesi. 503 menyebut komponen
   * yang gagal di `error.details`. Publik atas keputusan pengguna (16 November
   * 2026): siapa pun dapat mengetahui basis data sedang padam, dan itu dinilai
   * sepadan dengan gunanya bagi diagnosis.
   */
  @Public()
  @Get('health/siap')
  @ApiOperation({
    summary: 'Periksa basis data dan penyimpan sesi menjawab. Publik, tanpa sesi.',
  })
  @ApiOkResponse({ type: KesiapanEntity })
  @ApiServiceUnavailableResponse({
    description: 'Satu komponen atau lebih gagal; `error.details` berisi `{ db, redis }`.',
  })
  async getKesiapan(): Promise<KesiapanEntity> {
    const { siap, db, redis } = await this.kesiapan.periksa();
    if (!siap) {
      throw new ServiceUnavailableException({
        message: 'Layanan belum siap melayani.',
        code: 'TIDAK_SIAP',
        details: { db, redis },
      });
    }
    return new KesiapanEntity({ status: 'siap', db, redis });
  }
}
