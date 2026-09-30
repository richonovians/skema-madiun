import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginatedResult } from '../../common/dto/paginated-result';
import { AuditRetensiService } from './audit-retensi.service';
import { AuditService } from './audit.service';
import { ListAuditLogQueryDto } from './dto/list-audit-log-query.dto';
import { AuditLogEntity } from './entities/audit-log.entity';

/**
 * Log aktivitas -- SUPERUSER saja (2026-08-20). Admin Kabupaten biasa ditolak.
 *
 * `@Roles(Role.kabupaten)` di sini SUDAH menegakkan batasnya sejak T6
 * dibereskan (7 September 2026). Sebelum itu dekorator ini tak berarti apa-apa
 * bagi `kabupaten`, yang melampaui seluruh @Roles tanpa syarat -- rute inilah
 * contoh paling nyata mengapa bypass itu dibongkar.
 *
 * `AuditService.assertKabupaten` DIPERTAHANKAN sebagai lapis kedua, bukan sisa
 * yang lupa dibuang. Penjelasan lengkapnya ada di service.
 */
@ApiTags('audit')
@ApiBearerAuth()
@Controller('audit-logs')
export class AuditController {
  constructor(
    private readonly auditService: AuditService,
    private readonly retensiService: AuditRetensiService,
  ) {}

  /** Log aktivitas admin (siapa mengubah apa, kapan) — Admin Kabupaten. */
  @Get()
  @Roles(Role.kabupaten)
  @ApiOkResponse({ type: AuditLogEntity, isArray: true })
  findAll(
    @Query() query: ListAuditLogQueryDto,
    @CurrentUser() user: CurrentUser,
  ): Promise<PaginatedResult<AuditLogEntity>> {
    return this.auditService.findAll(query, user);
  }

  /**
   * Lama retensi log aktivitas (30 September 2026) — `null` berarti tak ada
   * pemangkasan sama sekali.
   *
   * ADA supaya halaman Log Aktivitas dapat MENERANGKAN kekosongan di luar
   * rentang retensi, alih-alih menampilkan hasil kosong tanpa sebab. Angkanya
   * dibaca dari sini, bukan ditulis mati di frontend, supaya keterangan di
   * layar tak pernah berbeda dari kebijakan yang sebenarnya berlaku.
   *
   * WAJIB DIDEKLARASIKAN SEBELUM `@Get(':id')` di bawah. Nest mencocokkan rute
   * menurut urutan deklarasi, dan `:id` ber-ParseIntPipe akan menelan alamat
   * ini lalu menjawab 400 "numeric string is expected". Uji unit controller
   * TIDAK menangkap kesalahan ini karena ia memanggil metodenya langsung —
   * penjagaannya ada di audit.e2e-spec.ts.
   */
  @Get('retensi')
  @Roles(Role.kabupaten)
  @ApiOperation({ summary: 'Lama retensi log aktivitas dalam hari (null = tanpa pemangkasan)' })
  retensi(): { hari: number | null } {
    return { hari: this.retensiService.hariRetensi() };
  }

  /** Detail satu log aktivitas — Admin Kabupaten. */
  @Get(':id')
  @Roles(Role.kabupaten)
  @ApiOkResponse({ type: AuditLogEntity })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUser,
  ): Promise<AuditLogEntity> {
    return this.auditService.findOne(id, user);
  }
}
