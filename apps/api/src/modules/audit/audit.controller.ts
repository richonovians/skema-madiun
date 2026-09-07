import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginatedResult } from '../../common/dto/paginated-result';
import { AuditService } from './audit.service';
import { ListAuditLogQueryDto } from './dto/list-audit-log-query.dto';
import { AuditLogEntity } from './entities/audit-log.entity';

/**
 * Log aktivitas -- SUPERUSER saja (2026-08-20). Admin Kabupaten biasa ditolak.
 *
 * `@Roles(Role.superuser)` di sini SUDAH menegakkan batasnya sejak T6
 * dibereskan (7 September 2026). Sebelum itu dekorator ini tak berarti apa-apa
 * bagi `kabupaten`, yang melampaui seluruh @Roles tanpa syarat -- rute inilah
 * contoh paling nyata mengapa bypass itu dibongkar.
 *
 * `AuditService.assertSuperuser` DIPERTAHANKAN sebagai lapis kedua, bukan sisa
 * yang lupa dibuang. Penjelasan lengkapnya ada di service.
 */
@ApiTags('audit')
@ApiBearerAuth()
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /** Log aktivitas admin (siapa mengubah apa, kapan) — Superuser. */
  @Get()
  @Roles(Role.superuser)
  @ApiOkResponse({ type: AuditLogEntity, isArray: true })
  findAll(
    @Query() query: ListAuditLogQueryDto,
    @CurrentUser() user: CurrentUser,
  ): Promise<PaginatedResult<AuditLogEntity>> {
    return this.auditService.findAll(query, user);
  }

  /** Detail satu log aktivitas — Superuser. */
  @Get(':id')
  @Roles(Role.superuser)
  @ApiOkResponse({ type: AuditLogEntity })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUser,
  ): Promise<AuditLogEntity> {
    return this.auditService.findOne(id, user);
  }
}
