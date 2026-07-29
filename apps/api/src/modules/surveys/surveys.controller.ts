import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginatedResult } from '../../common/dto/paginated-result';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CreateSurveyDto } from './dto/create-survey.dto';
import { ListSurveyQueryDto } from './dto/list-survey-query.dto';
import { UpdateSurveyDto } from './dto/update-survey.dto';
import { UpdateSurveyStatusDto } from './dto/update-survey-status.dto';
import { SurveyEntity } from './entities/survey.entity';
import { SurveysService } from './surveys.service';

@ApiTags('surveys')
@ApiBearerAuth()
@Controller('surveys')
export class SurveysController {
  constructor(private readonly surveysService: SurveysService) {}

  /** Daftar survei (Kabupaten: semua; Admin OPD: milik OPD-nya). */
  @Get()
  @Roles(Role.kabupaten, Role.opd)
  @ApiOkResponse({ type: SurveyEntity, isArray: true })
  findAll(
    @Query() query: ListSurveyQueryDto,
    @CurrentUser() user: CurrentUser,
  ): Promise<PaginatedResult<SurveyEntity>> {
    return this.surveysService.findAll(query, user);
  }

  /** Buat paket survei (Admin OPD). */
  @Post()
  @Roles(Role.opd)
  @Audit('survey')
  @ApiOkResponse({ type: SurveyEntity })
  create(@Body() dto: CreateSurveyDto, @CurrentUser() user: CurrentUser): Promise<SurveyEntity> {
    return this.surveysService.create(dto, user);
  }

  /**
   * Daftar survei aktif untuk dipilih responden.
   * WAJIB dideklarasikan sebelum `@Get(':id')`: Express 5 mencocokkan rute sesuai
   * urutan registrasi, sehingga literal `active` harus mendahului param `:id`.
   */
  @Get('active')
  @Roles(Role.responden)
  @ApiOkResponse({ type: SurveyEntity, isArray: true })
  findActive(@Query() query: PaginationQueryDto): Promise<PaginatedResult<SurveyEntity>> {
    return this.surveysService.findActive(query);
  }

  /** Detail survei. */
  @Get(':id')
  @Roles(Role.kabupaten, Role.opd)
  @ApiOkResponse({ type: SurveyEntity })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUser,
  ): Promise<SurveyEntity> {
    return this.surveysService.findOne(id, user);
  }

  /** Ubah survei (draft, Admin OPD). */
  @Patch(':id')
  @Roles(Role.opd)
  @Audit('survey')
  @ApiOkResponse({ type: SurveyEntity })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSurveyDto,
    @CurrentUser() user: CurrentUser,
  ): Promise<SurveyEntity> {
    return this.surveysService.update(id, dto, user);
  }

  /** Hapus survei (draft, Admin OPD). */
  @Delete(':id')
  @Roles(Role.opd)
  @Audit('survey')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUser): Promise<void> {
    return this.surveysService.remove(id, user);
  }

  /** Publikasikan / tutup survei (Admin OPD). */
  @Patch(':id/status')
  @Roles(Role.opd)
  @Audit('survey', 'update_status')
  @ApiOkResponse({ type: SurveyEntity })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSurveyStatusDto,
    @CurrentUser() user: CurrentUser,
  ): Promise<SurveyEntity> {
    return this.surveysService.updateStatus(id, dto, user);
  }

  /** Duplikasi survei periode sebelumnya (Admin OPD). */
  @Post(':id/duplicate')
  @Roles(Role.opd)
  @Audit('survey', 'duplicate')
  @ApiOkResponse({ type: SurveyEntity })
  duplicate(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUser,
  ): Promise<SurveyEntity> {
    return this.surveysService.duplicate(id, user);
  }
}
