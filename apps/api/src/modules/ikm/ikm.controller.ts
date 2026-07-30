import { Controller, Get, Param, ParseIntPipe, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiProduces, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { DashboardIkmQueryDto } from './dto/dashboard-ikm-query.dto';
import { ExportResultsQueryDto } from './dto/export-results-query.dto';
import { IkmDashboardEntity } from './entities/ikm-dashboard.entity';
import { IkmResultEntity } from './entities/ikm-result.entity';
import { IkmService } from './ikm.service';

@ApiTags('ikm')
@ApiBearerAuth()
@Controller()
export class IkmController {
  constructor(private readonly ikmService: IkmService) {}

  /** Hasil IKM survei: NRR per unsur + nilai IKM + mutu (Admin OPD pemilik & Kabupaten). */
  @Get('surveys/:surveyId/results')
  @Roles(Role.kabupaten, Role.opd)
  @ApiOkResponse({ type: IkmResultEntity })
  getResults(
    @Param('surveyId', ParseIntPipe) surveyId: number,
    @CurrentUser() user: CurrentUser,
  ): Promise<IkmResultEntity> {
    return this.ikmService.getResults(surveyId, user);
  }

  /**
   * Ekspor laporan hasil IKM (CSV/Excel/PDF). Menulis respons biner langsung via `@Res()`
   * (non-passthrough) — dengan sengaja MELEWATI `ResponseInterceptor` global (envelope JSON
   * tidak masuk akal untuk file unduhan).
   */
  @Get('surveys/:surveyId/results/export')
  @Roles(Role.kabupaten, Role.opd)
  @ApiProduces(
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/pdf',
  )
  async exportResults(
    @Param('surveyId', ParseIntPipe) surveyId: number,
    @Query() query: ExportResultsQueryDto,
    @CurrentUser() user: CurrentUser,
    @Res() res: Response,
  ): Promise<void> {
    const file = await this.ikmService.exportResults(surveyId, query.format, user);
    res.set({
      'Content-Type': file.contentType,
      'Content-Disposition': `attachment; filename="${file.filename}"`,
    });
    res.send(file.buffer);
  }

  /** Agregat & perbandingan IKM seluruh OPD (Admin Kabupaten), filter periode/jenis layanan. */
  @Get('dashboard/ikm')
  @Roles(Role.kabupaten)
  @ApiOkResponse({ type: IkmDashboardEntity })
  getDashboard(@Query() query: DashboardIkmQueryDto): Promise<IkmDashboardEntity> {
    return this.ikmService.getDashboard(query);
  }
}
