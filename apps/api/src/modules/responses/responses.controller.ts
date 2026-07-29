import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginatedResult } from '../../common/dto/paginated-result';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { SubmitResponseDto } from './dto/submit-response.dto';
import { ResponseEntity } from './entities/response.entity';
import { SurveyFillEntity } from './entities/survey-fill.entity';
import { ResponsesService } from './responses.service';

@ApiTags('responses')
@ApiBearerAuth()
@Controller()
export class ResponsesController {
  constructor(private readonly responsesService: ResponsesService) {}

  /** Ambil survei aktif + pertanyaannya untuk diisi (Responden). */
  @Get('surveys/:surveyId/fill')
  @Roles(Role.responden)
  @ApiOkResponse({ type: SurveyFillEntity })
  getFill(
    @Param('surveyId', ParseIntPipe) surveyId: number,
    @CurrentUser() user: CurrentUser,
  ): Promise<SurveyFillEntity> {
    return this.responsesService.getFill(surveyId, user);
  }

  /** Kirim jawaban survei (Responden). Duplikat → 409. */
  @Post('surveys/:surveyId/responses')
  @Roles(Role.responden)
  @ApiCreatedResponse({ type: ResponseEntity })
  submit(
    @Param('surveyId', ParseIntPipe) surveyId: number,
    @Body() dto: SubmitResponseDto,
    @CurrentUser() user: CurrentUser,
  ): Promise<ResponseEntity> {
    return this.responsesService.submit(surveyId, dto, user);
  }

  /** Daftar respons survei untuk admin (Admin OPD: milik OPD-nya; Kabupaten: semua). */
  @Get('surveys/:surveyId/responses')
  @Roles(Role.kabupaten, Role.opd)
  @ApiOkResponse({ type: ResponseEntity, isArray: true })
  findAll(
    @Param('surveyId', ParseIntPipe) surveyId: number,
    @Query() query: PaginationQueryDto,
    @CurrentUser() user: CurrentUser,
  ): Promise<PaginatedResult<ResponseEntity>> {
    return this.responsesService.findAllForSurvey(surveyId, query, user);
  }
}
