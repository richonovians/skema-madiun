import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Ip,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { BatasPerSurvei } from '../../common/decorators/batas-per-survei.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { SubmitPublicResponseDto } from './dto/submit-public-response.dto';
import { ResponseEntity } from './entities/response.entity';
import { SurveyFillEntity } from './entities/survey-fill.entity';
import { TurnstileService } from '../turnstile/turnstile.service';
import { ResponsesService } from './responses.service';

/** Dibaca frontend supaya pesannya dapat dibedakan dari penolakan lain. */
export const CAPTCHA_TIDAK_SAH = 'CAPTCHA_TIDAK_SAH';

/**
 * Pengisian survei TANPA sesi (rute frontend /survei/:id, sebelumnya /isi/:id
 * yang kini mengalihkan permanen ke sana).
 *
 * Controller TERPISAH dari ResponsesController dengan sengaja: tak ada
 * `@ApiBearerAuth`, tak ada `@Roles`, dan tak satu pun handler di sini yang
 * menerima `@CurrentUser`. Endpoint berpenjaga yang sudah ada tidak disentuh
 * satu baris pun, sehingga tak ada jalan bagi kelalaian di masa depan untuk
 * melonggarkan gerbang yang sudah benar. Keduanya menolak 404 kecuali survei
 * berstatus aktif DAN `izinkanAnonim`.
 *
 * Batas laju 20/menit per IP dipilih LONGGAR dengan sengaja: di loket layanan
 * seluruh pengunjung berbagi satu WiFi, jadi satu IP berarti banyak orang.
 * Batas ketat akan memblokir responden yang sah sementara satu pengirim
 * berulang dengan ponsel pribadi tetap lolos. Kunci penghitungnya `req.ip`,
 * yang sudah benar di belakang reverse proxy lewat `trust proxy` (app.setup.ts).
 */
@ApiTags('public')
@Controller('public/surveys')
// Penghitung batas laju dipisah per survei -- lihat dekoratornya.
@BatasPerSurvei()
export class PublicResponsesController {
  constructor(
    private readonly responsesService: ResponsesService,
    private readonly turnstile: TurnstileService,
  ) {}

  @Get(':surveyId/fill')
  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOkResponse({ type: SurveyFillEntity })
  getFill(@Param('surveyId', ParseIntPipe) surveyId: number): Promise<SurveyFillEntity> {
    return this.responsesService.getPublicFill(surveyId);
  }

  @Post(':surveyId/responses')
  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiCreatedResponse({ type: ResponseEntity })
  async submit(
    @Param('surveyId', ParseIntPipe) surveyId: number,
    @Body() dto: SubmitPublicResponseDto,
    @Ip() ip: string,
  ): Promise<ResponseEntity> {
    /**
     * SEBELUM apa pun ditulis. Penolakan yang terjadi sesudah barisnya masuk
     * bukan gerbang sama sekali -- ia hanya pesan galat di atas data yang
     * telanjur tersimpan.
     *
     * Token dari peramban tak boleh dipercaya begitu saja: siapa pun dapat
     * mengarangnya, dan yang menentukan sah-tidaknya hanya jawaban Cloudflare.
     * Di luar produksi tanpa TURNSTILE_SECRET_KEY, verifikasinya mati dan
     * memulangkan `true` -- lihat TurnstileService untuk penjaganya.
     */
    const sah = await this.turnstile.verifikasi(dto.captchaToken, ip);
    if (!sah) {
      throw new ForbiddenException({
        message: 'Verifikasi captcha gagal. Muat ulang halaman lalu coba lagi.',
        code: CAPTCHA_TIDAK_SAH,
      });
    }

    return this.responsesService.submitPublic(surveyId, dto);
  }
}
