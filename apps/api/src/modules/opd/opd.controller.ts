import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { assertOpdAccess } from '../../common/auth/opd-scope.util';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginatedResult } from '../../common/dto/paginated-result';
import { ListOpdQueryDto } from './dto/list-opd-query.dto';
import { OpdEntity } from './entities/opd.entity';
import { OpdService } from './opd.service';

@ApiTags('opd')
@ApiBearerAuth()
@Controller('opd')
export class OpdController {
  constructor(private readonly opdService: OpdService) {}

  /** Daftar OPD (cache lokal). Hanya Admin Kabupaten. */
  @Get()
  @Roles(Role.kabupaten)
  @ApiOkResponse({ type: OpdEntity, isArray: true })
  findAll(@Query() query: ListOpdQueryDto): Promise<PaginatedResult<OpdEntity>> {
    return this.opdService.findAll(query);
  }

  /** Detail OPD. Admin Kabupaten (semua) atau Admin OPD (miliknya sendiri). */
  @Get(':id')
  @Roles(Role.kabupaten, Role.opd)
  @ApiOkResponse({ type: OpdEntity })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUser,
  ): Promise<OpdEntity> {
    assertOpdAccess(user, id);
    return this.opdService.findOne(id);
  }
}
