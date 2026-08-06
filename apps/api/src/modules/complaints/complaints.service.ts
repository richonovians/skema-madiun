import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Complaint, ComplaintStatus, Prisma, Role } from '@prisma/client';
import { assertOpdAccess } from '../../common/auth/opd-scope.util';
import type { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginatedResult, paginate } from '../../common/dto/paginated-result';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { COMPLAINT_SUB_CATEGORIES } from '../reference/reference.constants';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { CreateReplyDto } from './dto/create-reply.dto';
import { ListComplaintQueryDto } from './dto/list-complaint-query.dto';
import { UpdateComplaintStatusDto } from './dto/update-complaint-status.dto';
import { ComplaintEntity } from './entities/complaint.entity';
import { ComplaintReplyEntity } from './entities/complaint-reply.entity';

/** Transisi status yang diizinkan (FR-CMP-03: Diterima → Diproses → Selesai, atau Ditolak). */
const ALLOWED_TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  [ComplaintStatus.diterima]: [ComplaintStatus.diproses, ComplaintStatus.ditolak],
  [ComplaintStatus.diproses]: [ComplaintStatus.selesai, ComplaintStatus.ditolak],
  [ComplaintStatus.selesai]: [],
  [ComplaintStatus.ditolak]: [],
};

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB — batas bisnis (dicek di sini, bukan di multer).
const MAX_FILES = 5;

interface SavedFile {
  fileUrl: string;
  mimeType: string;
  sizeBytes: number;
  absolutePath: string;
}

type ComplaintWithAttachments = Complaint & {
  attachments: {
    id: number;
    fileUrl: string;
    mimeType: string | null;
    sizeBytes: number | null;
    createdAt: Date;
  }[];
  /** Hanya terisi bila query di-`include` (lihat findAll, INT-11). */
  user?: { nama: string };
  /** Hanya terisi bila query di-`include` (lihat findByTicketNo, INT-18). */
  opd?: { nama: string };
};

@Injectable()
export class ComplaintsService {
  private readonly logger = new Logger(ComplaintsService.name);
  private readonly uploadDir: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    config: ConfigService,
  ) {
    this.uploadDir = path.resolve(process.cwd(), config.get<string>('upload.dir') ?? 'uploads');
  }

  /** Ajukan pengaduan baru (Responden). Lampiran divalidasi lalu disimpan SEBELUM baris DB dibuat. */
  async create(
    dto: CreateComplaintDto,
    files: Express.Multer.File[] | undefined,
    user: CurrentUser,
  ): Promise<ComplaintEntity> {
    await this.assertOpdExists(dto.opdId);
    this.assertSubKategoriConsistent(dto.kategori, dto.subKategori);
    const validFiles = this.validateFiles(files);
    const saved = await this.persistFiles(validFiles);

    try {
      const complaint = await this.insertWithUniqueTicket(dto, user.userId, saved);
      return this.toEntity(complaint);
    } catch (err) {
      // DB gagal setelah file tersimpan → bersihkan file yatim (best-effort).
      await this.cleanupFiles(saved);
      throw err;
    }
  }

  /**
   * Daftar pengaduan — terfilter kepemilikan (Responden: milik sendiri; OPD:
   * OPD-nya; Kabupaten: semua). Sertakan `opdNama` (INT-18) selain
   * `reporterNama` (INT-11) -- daftar pengaduan responden perlu kolom "OPD
   * Tujuan" per baris.
   */
  async findAll(
    query: ListComplaintQueryDto,
    user: CurrentUser,
  ): Promise<PaginatedResult<ComplaintEntity>> {
    const { page, limit, status } = query;
    const where: Prisma.ComplaintWhereInput = { ...this.ownershipWhere(user) };
    if (status) {
      where.status = status;
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.complaint.findMany({
        where,
        include: {
          attachments: true,
          user: { select: { nama: true } },
          opd: { select: { nama: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.complaint.count({ where }),
    ]);

    return paginate(
      rows.map((row) => this.toEntity(row)),
      total,
      page,
      limit,
    );
  }

  /**
   * Detail & lacak status via nomor tiket (identifier publik). Sertakan
   * `opdNama` (INT-18) -- halaman detail pengaduan responden perlu tahu
   * "ditujukan ke OPD mana", sebelumnya endpoint ini tak sertakan sama sekali.
   * Sertakan juga `reporterNama` (INT-20) -- halaman detail Admin OPD perlu
   * profil pelapor, endpoint ini sebelumnya cuma include `opd`, bukan `user`,
   * jadi reporterNama selalu kosong meski findAll sudah menyertakannya.
   */
  async findByTicketNo(ticketNo: string, user: CurrentUser): Promise<ComplaintEntity> {
    const complaint = await this.prisma.complaint.findUnique({
      where: { ticketNo },
      include: {
        attachments: true,
        user: { select: { nama: true } },
        opd: { select: { nama: true } },
      },
    });
    if (!complaint) {
      throw new NotFoundException(`Pengaduan dengan nomor tiket ${ticketNo} tidak ditemukan`);
    }
    this.assertAccess(user, complaint);
    return this.toEntity(complaint);
  }

  /** Ubah status pengaduan (Admin OPD pemilik). Ditolak WAJIB disertai catatan/alasan. */
  async updateStatus(
    id: number,
    dto: UpdateComplaintStatusDto,
    user: CurrentUser,
  ): Promise<ComplaintEntity> {
    const complaint = await this.getByIdOrThrow(id);
    assertOpdAccess(user, complaint.opdId);

    if (!ALLOWED_TRANSITIONS[complaint.status].includes(dto.status)) {
      throw new BadRequestException(
        `Transisi status ${complaint.status} → ${dto.status} tidak diizinkan`,
      );
    }
    if (dto.status === ComplaintStatus.ditolak && !dto.catatan) {
      throw new BadRequestException('Alasan penolakan (catatan) wajib diisi');
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.complaint.update({
        where: { id },
        data: { status: dto.status },
        include: { attachments: true },
      }),
      ...(dto.catatan
        ? [
            this.prisma.complaintReply.create({
              data: { complaintId: id, authorId: user.userId, pesan: dto.catatan },
            }),
          ]
        : []),
    ]);
    await this.notificationsService.notifyComplaintStatusChanged(updated);
    return this.toEntity(updated as ComplaintWithAttachments);
  }

  /** Riwayat tanggapan pada satu tiket. */
  async listReplies(complaintId: number, user: CurrentUser): Promise<ComplaintReplyEntity[]> {
    const complaint = await this.getByIdOrThrow(complaintId);
    this.assertAccess(user, complaint);

    const rows = await this.prisma.complaintReply.findMany({
      where: { complaintId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((row) => new ComplaintReplyEntity(row));
  }

  /** Tambah tanggapan (Admin OPD pemilik atau Responden pengaju). */
  async addReply(
    complaintId: number,
    dto: CreateReplyDto,
    user: CurrentUser,
  ): Promise<ComplaintReplyEntity> {
    const complaint = await this.getByIdOrThrow(complaintId);
    this.assertAccess(user, complaint);

    const created = await this.prisma.complaintReply.create({
      data: { complaintId, authorId: user.userId, pesan: dto.pesan },
    });
    await this.notificationsService.notifyComplaintReply(complaint, user.userId);
    return new ComplaintReplyEntity(created);
  }

  /** Fragmen `where` sesuai kepemilikan data (dipakai findAll). */
  private ownershipWhere(user: CurrentUser): Prisma.ComplaintWhereInput {
    if (user.role === Role.kabupaten) {
      return {};
    }
    if (user.role === Role.opd) {
      if (user.opdId == null) {
        throw new ForbiddenException('Akun OPD tidak tertaut ke OPD mana pun');
      }
      return { opdId: user.opdId };
    }
    if (user.role === Role.responden) {
      return { userId: user.userId };
    }
    throw new ForbiddenException('Peran tidak memiliki akses ke pengaduan');
  }

  /** Akses per-record: kabupaten (=superuser) semua; OPD hanya OPD-nya; Responden hanya miliknya. */
  private assertAccess(user: CurrentUser, complaint: { userId: number; opdId: number }): void {
    if (user.role === Role.kabupaten) {
      return;
    }
    if (user.role === Role.opd) {
      if (user.opdId === complaint.opdId) {
        return;
      }
      throw new ForbiddenException('Anda tidak memiliki akses ke pengaduan ini');
    }
    if (user.role === Role.responden) {
      if (user.userId === complaint.userId) {
        return;
      }
      throw new ForbiddenException('Anda tidak memiliki akses ke pengaduan ini');
    }
    throw new ForbiddenException('Peran tidak memiliki akses ke pengaduan');
  }

  /** subKategori (bila diisi) wajib sejalan dgn kategori induknya (INT-42, D12). */
  private assertSubKategoriConsistent(kategori: string, subKategori?: string): void {
    if (!subKategori) {
      return;
    }
    const sub = COMPLAINT_SUB_CATEGORIES.find((s) => s.kode === subKategori);
    if (!sub || sub.kategoriKode !== kategori) {
      throw new BadRequestException(
        `Sub-kategori "${subKategori}" tidak sesuai dengan kategori "${kategori}"`,
      );
    }
  }

  private async assertOpdExists(opdId: number): Promise<void> {
    const opd = await this.prisma.opd.findUnique({ where: { id: opdId } });
    if (!opd) {
      throw new BadRequestException(`OPD dengan id ${opdId} tidak ditemukan`);
    }
  }

  private async getByIdOrThrow(id: number): Promise<Complaint> {
    const complaint = await this.prisma.complaint.findUnique({ where: { id } });
    if (!complaint) {
      throw new NotFoundException(`Pengaduan dengan id ${id} tidak ditemukan`);
    }
    return complaint;
  }

  /** Ticket publik ber-format `PGD{YYYYMMDD}{4 acak}` — retry saat tabrakan (unique constraint). */
  private generateTicketNo(): string {
    const now = new Date();
    const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
      now.getDate(),
    ).padStart(2, '0')}`;
    const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `PGD${datePart}${randomPart}`;
  }

  private async insertWithUniqueTicket(
    dto: CreateComplaintDto,
    userId: number,
    attachments: SavedFile[],
  ): Promise<ComplaintWithAttachments> {
    const attachmentData = attachments.map(({ fileUrl, mimeType, sizeBytes }) => ({
      fileUrl,
      mimeType,
      sizeBytes,
    }));

    for (let attempt = 0; attempt < 5; attempt++) {
      const ticketNo = this.generateTicketNo();
      try {
        return await this.prisma.complaint.create({
          data: {
            ticketNo,
            userId,
            opdId: dto.opdId,
            kategori: dto.kategori,
            subKategori: dto.subKategori,
            judul: dto.judul,
            uraian: dto.uraian,
            attachments: { create: attachmentData },
          },
          include: { attachments: true },
        });
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          continue; // tabrakan nomor tiket — coba lagi dengan nomor baru
        }
        throw err;
      }
    }
    throw new ConflictException('Gagal membuat nomor tiket unik, silakan coba lagi');
  }

  /** Validasi tipe & ukuran lampiran (batas bisnis — 400 yang jelas, bukan error multer). */
  private validateFiles(files: Express.Multer.File[] | undefined): Express.Multer.File[] {
    const list = files ?? [];
    if (list.length > MAX_FILES) {
      throw new BadRequestException(`Maksimal ${MAX_FILES} lampiran per pengaduan`);
    }
    for (const file of list) {
      if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
        throw new BadRequestException(
          `Tipe berkas "${file.mimetype}" tidak diizinkan (hanya JPEG/PNG/WEBP/PDF)`,
        );
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        throw new BadRequestException(`Ukuran berkas "${file.originalname}" melebihi 5MB`);
      }
    }
    return list;
  }

  private async persistFiles(files: Express.Multer.File[]): Promise<SavedFile[]> {
    if (files.length === 0) {
      return [];
    }
    const dir = path.join(this.uploadDir, 'complaints');
    await fs.mkdir(dir, { recursive: true });

    const saved: SavedFile[] = [];
    for (const file of files) {
      const filename = `${randomUUID()}-${this.sanitizeFilename(file.originalname)}`;
      const absolutePath = path.join(dir, filename);
      await fs.writeFile(absolutePath, file.buffer);
      saved.push({
        fileUrl: `/uploads/complaints/${filename}`,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        absolutePath,
      });
    }
    return saved;
  }

  private async cleanupFiles(saved: SavedFile[]): Promise<void> {
    await Promise.all(
      saved.map(async (file) => {
        try {
          await fs.unlink(file.absolutePath);
        } catch (err) {
          this.logger.warn(`Gagal membersihkan file yatim ${file.absolutePath}: ${String(err)}`);
        }
      }),
    );
  }

  private sanitizeFilename(name: string): string {
    return name.replace(/[^a-zA-Z0-9.\-_]/g, '_').slice(-100);
  }

  private toEntity(row: ComplaintWithAttachments): ComplaintEntity {
    const { user, opd, ...rest } = row;
    return new ComplaintEntity({
      ...rest,
      attachments: rest.attachments.map((a) => ({ ...a })),
      reporterNama: user?.nama,
      opdNama: opd?.nama,
    });
  }
}
