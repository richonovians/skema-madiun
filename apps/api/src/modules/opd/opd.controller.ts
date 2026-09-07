import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { assertOpdAccess } from '../../common/auth/opd-scope.util';
import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginatedResult } from '../../common/dto/paginated-result';
import { ListOpdQueryDto } from './dto/list-opd-query.dto';
import { OpdEntity } from './entities/opd.entity';
import { OpdSyncReport } from './entities/opd-sync-report.entity';
import { OpdService } from './opd.service';

@ApiTags('opd')
@ApiBearerAuth()
@Controller('opd')
export class OpdController {
  constructor(private readonly opdService: OpdService) {}

  /**
   * Daftar OPD (cache lokal). Tanpa `@Roles` = seluruh peran terautentikasi
   * boleh (INT-18) -- data direktori OPD tak sensitif & dibutuhkan Responden
   * utk memilih instansi tujuan saat membuat pengaduan (dropdown
   * CreateComplaintForm.jsx). Sebelumnya dibatasi Admin Kabupaten saja,
   * membuat form pengaduan Responden tak bisa menampilkan pilihan OPD sama
   * sekali (403 diam-diam tertelan di frontend, ditemukan saat wiring INT-18).
   */
  @Get()
  @ApiOkResponse({ type: OpdEntity, isArray: true })
  findAll(@Query() query: ListOpdQueryDto): Promise<PaginatedResult<OpdEntity>> {
    return this.opdService.findAll(query);
  }

  /** Sinkronisasi data OPD dari Helpdesk (upsert by external_id). Hanya Admin Kabupaten. */
  @Post('sync')
  @Roles(Role.kabupaten, Role.superuser)
  @Audit('opd', 'sync')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: OpdSyncReport })
  sync(): Promise<OpdSyncReport> {
    return this.opdService.syncFromSource();
  }

  /** Detail OPD. Admin Kabupaten (semua) atau Admin OPD (miliknya sendiri). */
  @Get(':id')
  @Roles(Role.kabupaten, Role.superuser, Role.opd)
  @ApiOkResponse({ type: OpdEntity })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUser,
  ): Promise<OpdEntity> {
    assertOpdAccess(user, id);
    return this.opdService.findOne(id);
  }
}
