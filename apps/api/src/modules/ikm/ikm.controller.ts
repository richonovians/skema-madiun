import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { DashboardIkmQueryDto } from './dto/dashboard-ikm-query.dto';
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

  /** Agregat & perbandingan IKM seluruh OPD (Admin Kabupaten), filter periode/jenis layanan. */
  @Get('dashboard/ikm')
  @Roles(Role.kabupaten)
  @ApiOkResponse({ type: IkmDashboardEntity })
  getDashboard(@Query() query: DashboardIkmQueryDto): Promise<IkmDashboardEntity> {
    return this.ikmService.getDashboard(query);
  }
}
