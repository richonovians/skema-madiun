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
import { CreateReplyDto } from './dto/create-reply.dto';
import { ListComplaintQueryDto } from './dto/list-complaint-query.dto';
import { UpdateComplaintStatusDto } from './dto/update-complaint-status.dto';
import { ComplaintEntity } from './entities/complaint.entity';
import { ComplaintReplyEntity } from './entities/complaint-reply.entity';

// Ceiling multer murni pertahanan (anti abuse); batas bisnis nyata (5MB/tipe) dicek di service
// agar pelanggaran wajar menghasilkan 400 yang jelas, bukan error multer mentah.
const MULTER_HARD_CEILING_BYTES = 20 * 1024 * 1024;

@ApiTags('complaints')
@ApiBearerAuth()
@Controller('complaints')
export class ComplaintsController {
  constructor(private readonly complaintsService: ComplaintsService) {}

  /** Ajukan pengaduan (Responden) — dapat nomor tiket. Lampiran opsional (multipart). */
  @Post()
  @Roles(Role.responden)
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
  @Roles(Role.opd)
  @Audit('complaint', 'update_status')
  @ApiOkResponse({ type: ComplaintEntity })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateComplaintStatusDto,
    @CurrentUser() user: CurrentUser,
  ): Promise<ComplaintEntity> {
    return this.complaintsService.updateStatus(id, dto, user);
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

  /** Tambah tanggapan (Admin OPD pemilik atau Responden pengaju). Lampiran opsional (multipart). */
  @Post(':id/replies')
  @Roles(Role.opd, Role.responden)
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
