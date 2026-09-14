import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { memoryStorage } from 'multer';
import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginatedResult } from '../../common/dto/paginated-result';
import { ComplaintsService } from './complaints.service';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { ForwardComplaintDto } from './dto/forward-complaint.dto';
import { CreateReplyDto } from './dto/create-reply.dto';
import { ListComplaintQueryDto } from './dto/list-complaint-query.dto';
import { UpdateComplaintStatusDto } from './dto/update-complaint-status.dto';
import { BATAS_UKURAN_LAMPIRAN_BYTES } from './complaints.constants';
import { ComplaintEntity } from './entities/complaint.entity';
import { ComplaintReplyEntity } from './entities/complaint-reply.entity';

// Langit-langit multer kini MENYAMAI batas bisnis (14 September 2026). Lihat
// complaints.constants.ts untuk alasannya, termasuk kenapa dulu empat kali
// lebih longgar dan kenapa itu tak lagi sepadan.
const MULTER_HARD_CEILING_BYTES = BATAS_UKURAN_LAMPIRAN_BYTES;

@ApiTags('complaints')
@ApiBearerAuth()
@Controller('complaints')
export class ComplaintsController {
  constructor(private readonly complaintsService: ComplaintsService) {}

  /**
   * Ajukan pengaduan (Responden) — dapat nomor tiket. Lampiran opsional (multipart).
   *
   * `@Audit` ditambahkan 13 September 2026 (laporan pengguna: aktivitas warga
   * tak pernah masuk audit log). Isi keluhan disunting `redactAuditBody`
   * lewat kunci `uraian`; yang tercatat "warga mengajukan pengaduan", bukan
   * keluhannya.
   */
  @Post()
  @Roles(Role.responden)
  @Audit('complaint')
  @UseInterceptors(
    FilesInterceptor('lampiran', 5, {
      storage: memoryStorage(),
      limits: { fileSize: MULTER_HARD_CEILING_BYTES, files: 5 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiCreatedResponse({ type: ComplaintEntity })
  create(
    @Body() dto: CreateComplaintDto,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: CurrentUser,
  ): Promise<ComplaintEntity> {
    return this.complaintsService.create(dto, files, user);
  }

  /**
   * Daftar pengaduan — terfilter kepemilikan (lihat catatan¹ Routes-List): tanpa
   * `@Roles` = seluruh peran terautentikasi boleh, isolasi ditegakkan di service.
   */
  @Get()
  @ApiOkResponse({ type: ComplaintEntity, isArray: true })
  findAll(
    @Query() query: ListComplaintQueryDto,
    @CurrentUser() user: CurrentUser,
  ): Promise<PaginatedResult<ComplaintEntity>> {
    return this.complaintsService.findAll(query, user);
  }

  /** Detail & lacak status via nomor tiket (identifier publik). */
  @Get(':ticketNo')
  @ApiOkResponse({ type: ComplaintEntity })
  findOne(
    @Param('ticketNo') ticketNo: string,
    @CurrentUser() user: CurrentUser,
  ): Promise<ComplaintEntity> {
    return this.complaintsService.findByTicketNo(ticketNo, user);
  }

  /** Ubah status pengaduan (Admin OPD pemilik). */
  @Patch(':id/status')
  @Roles(Role.kabupaten, Role.superuser, Role.opd)
  @Audit('complaint', 'update_status')
  @ApiOkResponse({ type: ComplaintEntity })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateComplaintStatusDto,
    @CurrentUser() user: CurrentUser,
  ): Promise<ComplaintEntity> {
    return this.complaintsService.updateStatus(id, dto, user);
  }

  /**
   * Teruskan pengaduan yang belum bertujuan ke OPD yang berwenang
   * (6 September 2026).
   *
   * `@Roles(Role.kabupaten, Role.superuser)` DITAMBAHKAN saat T6 dibereskan
   * (7 September 2026). Sebelumnya rute ini sengaja TANPA dekorator, dan
   * alasannya masuk akal saat itu: bypass menyeluruh membuat
   * `@Roles(Role.kabupaten)` MELOLOSKAN lebih banyak, bukan lebih sedikit.
   * Begitu bypass-nya dibongkar, alasan itu hilang -- dan rute tanpa dekorator
   * justru terbuka bagi SETIAP pengguna terautentikasi di lapis guard.
   *
   * Daftarnya PERSIS `FULL_ACCESS_ROLES`, jadi tak ada perubahan siapa yang
   * boleh: yang berubah hanya lapis mana yang menolak lebih dahulu. Pemeriksaan
   * di service tetap ada, dengan pesan yang lebih spesifik.
   */
  @Patch(':id/opd')
  @Roles(Role.kabupaten, Role.superuser)
  @Audit('complaint', 'forward')
  @ApiOkResponse({ type: ComplaintEntity })
  forward(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ForwardComplaintDto,
    @CurrentUser() user: CurrentUser,
  ): Promise<ComplaintEntity> {
    return this.complaintsService.forward(id, dto, user);
  }

  /** Riwayat tanggapan pada satu tiket. */
  @Get(':id/replies')
  @ApiOkResponse({ type: ComplaintReplyEntity, isArray: true })
  listReplies(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUser,
  ): Promise<ComplaintReplyEntity[]> {
    return this.complaintsService.listReplies(id, user);
  }

  /**
   * Tambah tanggapan (Admin OPD pemilik atau Responden pengaju). Lampiran opsional (multipart).
   *
   * Teraudit sejak 13 September 2026. Berlaku untuk SEMUA peran di daftar
   * `@Roles` di bawah, bukan hanya warga: balasan Admin OPD pun sebelumnya tak
   * pernah tercatat, dan itu celah yang sama.
   */
  @Post(':id/replies')
  @Roles(Role.kabupaten, Role.superuser, Role.opd, Role.responden)
  @Audit('complaint_reply')
  @UseInterceptors(
    FilesInterceptor('lampiran', 5, {
      storage: memoryStorage(),
      limits: { fileSize: MULTER_HARD_CEILING_BYTES, files: 5 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiCreatedResponse({ type: ComplaintReplyEntity })
  addReply(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateReplyDto,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: CurrentUser,
  ): Promise<ComplaintReplyEntity> {
    return this.complaintsService.addReply(id, dto, files, user);
  }
}
