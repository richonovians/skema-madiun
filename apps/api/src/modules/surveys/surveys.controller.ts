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
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginatedResult } from '../../common/dto/paginated-result';
import { CreateSurveyDto } from './dto/create-survey.dto';
import { ListActiveSurveyQueryDto } from './dto/list-active-survey-query.dto';
import { ListSurveyQueryDto } from './dto/list-survey-query.dto';
import { UpdateSurveyDto } from './dto/update-survey.dto';
import { UpdateSurveyStatusDto } from './dto/update-survey-status.dto';
import { SurveyEntity } from './entities/survey.entity';
import { TrashedSurveyEntity } from './entities/trashed-survey.entity';
import { SurveiPemusnahanService } from './survei-pemusnahan.service';
import { SurveysService } from './surveys.service';

@ApiTags('surveys')
@ApiBearerAuth()
@Controller('surveys')
export class SurveysController {
  constructor(
    private readonly surveysService: SurveysService,
    private readonly pemusnahanService: SurveiPemusnahanService,
  ) {}

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
  @Roles(Role.kabupaten, Role.opd)
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
  @ApiOperation({ summary: 'Daftar survei aktif yang dapat dipilih responden.' })
  @Roles(Role.responden)
  @ApiOkResponse({ type: SurveyEntity, isArray: true })
  findActive(@Query() query: ListActiveSurveyQueryDto): Promise<PaginatedResult<SurveyEntity>> {
    return this.surveysService.findActive(query);
  }

  /**
   * Isi Sampah. WAJIB dideklarasikan sebelum `@Get(':id')` -- Express 5
   * mencocokkan rute sesuai urutan registrasi, jadi literal `trash` harus
   * mendahului param `:id`. Alasan yang sama berlaku bagi `active` di atas.
   */
  @Get('trash')
  @ApiOperation({ summary: 'Isi Sampah: survei yang dibuang dan belum dimusnahkan.' })
  @Roles(Role.kabupaten, Role.opd)
  @ApiOkResponse({ type: TrashedSurveyEntity, isArray: true })
  findTrashed(
    @Query() query: ListSurveyQueryDto,
    @CurrentUser() user: CurrentUser,
  ): Promise<PaginatedResult<TrashedSurveyEntity>> {
    return this.surveysService.findTrashed(query, user);
  }

  /**
   * Umur Sampah yang berlaku, dalam hari (`null` = pemusnahan otomatis
   * dimatikan). Dipajang di halaman Sampah kedua peran.
   *
   * Dibuka untuk `opd` juga, dan itu perlu: sejak 30 September 2026 Admin OPD
   * memusnahkan sendiri isi Sampah-nya, jadi ia berhak tahu kebijakan yang
   * akan menghabisinya lebih dulu.
   */
  @Get('trash/retensi')
  @Roles(Role.kabupaten, Role.opd)
  @ApiOperation({ summary: 'Umur Sampah survei dalam hari (null = tanpa pemusnahan otomatis)' })
  retensiSampah(): { hari: number | null } {
    return { hari: this.pemusnahanService.hariPemusnahan() };
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
  @Roles(Role.kabupaten, Role.opd)
  @Audit('survey')
  @ApiOkResponse({ type: SurveyEntity })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSurveyDto,
    @CurrentUser() user: CurrentUser,
  ): Promise<SurveyEntity> {
    return this.surveysService.update(id, dto, user);
  }

  /**
   * Buang survei ke Sampah. BERUBAH ARTI 11 September 2026: dahulu penghapusan
   * permanen khusus draf, kini soft delete untuk semua status. Pemusnahan
   * permanennya ada di `DELETE /surveys/:id/purge`.
   */
  @Delete(':id')
  @ApiOperation({
    summary: 'Buang survei ke Sampah (soft delete). Pemusnahan permanen ada di /surveys/:id/purge.',
  })
  @Roles(Role.kabupaten, Role.opd)
  @Audit('survey')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUser): Promise<void> {
    return this.surveysService.remove(id, user);
  }

  /** Pulihkan survei dari Sampah. */
  @Post(':id/restore')
  @Roles(Role.kabupaten, Role.opd)
  @Audit('survey', 'restore')
  @ApiOkResponse({ type: SurveyEntity })
  restore(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUser,
  ): Promise<SurveyEntity> {
    return this.surveysService.restore(id, user);
  }

  /**
   * Musnahkan permanen dari Sampah.
   *
   * DIBUKA UNTUK Role.opd (30 September 2026, permintaan pengguna). Sebelumnya
   * peran ini sengaja dikecualikan sebab tindakannya tak dapat dibatalkan dan
   * ikut membawa jawaban responden. Yang membuat pelebaran ini aman bukan
   * berkurangnya akibat -- akibatnya sama persis -- melainkan bahwa
   * `getTrashedOrThrow` memanggil `assertOpdAccess`, sehingga Admin OPD hanya
   * dapat menjangkau survei OPD-nya sendiri. Ia memusnahkan hasil pengukuran
   * yang memang menjadi tanggung jawabnya.
   *
   * Kurungan itulah yang harus tetap dijaga. Uji `Admin OPD TETAP ditolak
   * memusnahkan survei OPD LAIN` di surveys-trash.e2e-spec.ts ada untuk itu,
   * dan ia lebih penting daripada uji jalur bahagianya.
   */
  @Delete(':id/purge')
  @ApiOperation({ summary: 'Musnahkan survei permanen dari Sampah. Tidak dapat dibatalkan.' })
  @Roles(Role.kabupaten, Role.opd)
  @Audit('survey', 'purge')
  @HttpCode(HttpStatus.OK)
  purge(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: CurrentUser): Promise<void> {
    return this.surveysService.purge(id, user);
  }

  /** Publikasikan / tutup survei (Admin OPD). */
  @Patch(':id/status')
  @Roles(Role.kabupaten, Role.opd)
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
  @Roles(Role.kabupaten, Role.opd)
  @Audit('survey', 'duplicate')
  @ApiOkResponse({ type: SurveyEntity })
  duplicate(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUser,
  ): Promise<SurveyEntity> {
    return this.surveysService.duplicate(id, user);
  }
}
