import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { DashboardService } from './dashboard.service';
import { UpdateInsightDto } from './dto/update-insight.dto';
import { OpdDashboardEntity } from './entities/opd-dashboard.entity';
import { StatisticsEntity, StatisticsInsightEntity } from './entities/statistics.entity';

@ApiTags('dashboard')
@Controller()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /** Ringkasan dashboard Admin OPD (INT-12): IKM survei terbaru, tiket aktif, SLA, umpan balik terbaru. */
  @Get('dashboard/opd')
  @ApiBearerAuth()
  @Roles(Role.opd)
  @ApiOkResponse({ type: OpdDashboardEntity })
  getOpdDashboard(@CurrentUser() user: CurrentUser): Promise<OpdDashboardEntity> {
    return this.dashboardService.getOpdDashboard(user);
  }

  /** Statistik publik (INT-14, D2: TANPA autentikasi) -- ringkasan lintas seluruh OPD. */
  @Get('statistics')
  @Public()
  @ApiOkResponse({ type: StatisticsEntity })
  getStatistics(): Promise<StatisticsEntity> {
    return this.dashboardService.getStatistics();
  }

  /** Isi/perbarui narasi `/statistics` (D6) -- Admin Kabupaten. */
  @Patch('statistics/insight')
  @ApiBearerAuth()
  @Roles(Role.kabupaten)
  @ApiOkResponse({ type: StatisticsInsightEntity })
  updateInsight(
    @Body() dto: UpdateInsightDto,
    @CurrentUser() user: CurrentUser,
  ): Promise<StatisticsInsightEntity> {
    return this.dashboardService.updateInsight(dto, user);
  }
}
