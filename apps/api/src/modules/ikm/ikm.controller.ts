import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
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
}
