import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { SubmitResponseDto } from './dto/submit-response.dto';
import { ResponseEntity } from './entities/response.entity';
import { SurveyFillEntity } from './entities/survey-fill.entity';
import { ResponsesService } from './responses.service';

/**
 * Pengisian survei TANPA sesi (rute frontend /isi/:id).
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
export class PublicResponsesController {
  constructor(private readonly responsesService: ResponsesService) {}

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
  submit(
    @Param('surveyId', ParseIntPipe) surveyId: number,
    @Body() dto: SubmitResponseDto,
  ): Promise<ResponseEntity> {
    return this.responsesService.submitPublic(surveyId, dto);
  }
}
