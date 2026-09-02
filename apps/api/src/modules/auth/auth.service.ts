import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import type { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ConsentService } from './consent.service';
import { DevLoginDto } from './dto/dev-login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { MeEntity } from './entities/me.entity';
import { SessionEntity } from './entities/session.entity';
import { SessionService } from './session/session.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionService: SessionService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Login sementara (BUKAN SSO) — terbitkan sesi untuk pengguna seed yang sudah ada,
   * tanpa password (konsisten dgn keputusan arsitektur: tidak ada auth lokal). Dipagari
   * NonProductionGuard di controller. Digantikan callback SSO nyata saat spec Helpdesk
   * tersedia — SessionService.issue() yang dipanggil di sini akan tetap dipakai sama
   * persis oleh callback itu nanti (lihat SessionService).
   */
  async devLogin(dto: DevLoginDto): Promise<SessionEntity> {
    const identifier = dto.identifier.trim();
    const row = await this.prisma.user.findFirst({
      where: {
        deletedAt: null,
        OR: [{ email: identifier.toLowerCase() }, { ssoSubject: identifier }],
      },
      include: { respondentProfile: true },
    });
    if (!row) {
      throw new NotFoundException(
        `Pengguna dengan email/ssoSubject "${identifier}" tidak ditemukan`,
      );
    }
    if (!row.isActive) {
      throw new ForbiddenException('Akun tidak aktif');
    }

    await this.prisma.user.update({ where: { id: row.id }, data: { lastLoginAt: new Date() } });
    // Dicatat SETELAH kedua penolakan di atas: login gagal tak punya aktor untuk
    // ditunjuk (`audit_logs.actor_id` NOT NULL), jadi kegagalan tetap hanya masuk
    // log aplikasi. Lihat catatan di AuthController.logout.
    await this.audit.record(row.id, 'login', 'auth', { via: 'dev-login' });

    const token = this.sessionService.issue(row.id);
    // Lewat helper yang SAMA dengan getMe: sebelumnya `new MeEntity(row)`
    // langsung, sehingga `consentRequired` & `ssoLinked` tak pernah terisi di
    // jalur dev-login dan frontend tak tahu harus mengarahkan ke persetujuan.
    return new SessionEntity({ token, user: toMeEntity(row) });
  }

  /**
   * Sesi lokal bersifat stateless (JWT tanpa daftar pencabutan) — logout sungguhan
   * terjadi di klien (buang token tersimpan). Endpoint ini tetap disediakan sebagai
   * kontrak stabil bagi frontend, dan titik perluasan bila pencabutan sisi-server
   * dibutuhkan nanti (mis. saat SSO nyata aktif) tanpa mengubah kontrak klien.
   */
  logout(): { success: true } {
    return { success: true };
  }

  /** Profil pengguna aktif + profil demografis (bila responden). */
  async getMe(user: CurrentUser): Promise<MeEntity> {
    const row = await this.prisma.user.findFirst({
      where: { id: user.userId, deletedAt: null },
      include: { respondentProfile: true },
    });
    if (!row) {
      throw new NotFoundException('Pengguna tidak ditemukan');
    }
    return toMeEntity(row);
  }

  /** Ubah nama (semua peran) + demografis (khusus responden). Data dipakai ulang antar survei. */
  async updateProfile(user: CurrentUser, dto: UpdateProfileDto): Promise<MeEntity> {
    if (dto.nama !== undefined) {
      await this.prisma.user.update({ where: { id: user.userId }, data: { nama: dto.nama } });
    }

    if (user.role === Role.responden) {
      await this.upsertRespondentProfile(user.userId, dto);
    }

    return this.getMe(user);
  }

  private async upsertRespondentProfile(userId: number, dto: UpdateProfileDto): Promise<void> {
    const hasDemografis =
      dto.jenisKelamin !== undefined ||
      dto.kelompokUmur !== undefined ||
      dto.pendidikan !== undefined ||
      dto.pekerjaan !== undefined;
    if (!hasDemografis) {
      return;
    }

    const existing = await this.prisma.respondentProfile.findUnique({ where: { userId } });
    if (existing) {
      // Prisma mengabaikan field undefined → update parsial aman.
      await this.prisma.respondentProfile.update({
        where: { userId },
        data: {
          jenisKelamin: dto.jenisKelamin,
          kelompokUmur: dto.kelompokUmur,
          pendidikan: dto.pendidikan,
          pekerjaan: dto.pekerjaan,
        },
      });
      return;
    }

    // Pembuatan profil baru wajib lengkap (kolom NOT NULL).
    if (!dto.jenisKelamin || !dto.kelompokUmur || !dto.pendidikan || !dto.pekerjaan) {
      throw new BadRequestException(
        'Profil demografis baru memerlukan jenisKelamin, kelompokUmur, pendidikan, dan pekerjaan',
      );
    }
    await this.prisma.respondentProfile.create({
      data: {
        userId,
        jenisKelamin: dto.jenisKelamin,
        kelompokUmur: dto.kelompokUmur,
        pendidikan: dto.pendidikan,
        pekerjaan: dto.pekerjaan,
      },
    });
  }
}

/**
 * Pola nilai PENAMPUNG `sso_subject` dari masa sebelum SSO. `seed-*` dibuat
 * skrip seeder, `pending:<email>` dibuat saat admin membuat akun lewat
 * Manajemen User sebelum penggunanya pernah masuk lewat Helpdesk.
 *
 * Keduanya diganti `sub` asli pada login SSO pertama — lihat langkah 2
 * pencocokan di SsoService.provision.
 */
const SSO_PLACEHOLDER = /^(seed-|pending:)/;

function isSsoLinked(ssoSubject: string | null): boolean {
  return Boolean(ssoSubject) && !SSO_PLACEHOLDER.test(ssoSubject as string);
}

/** Baris Prisma yang dibutuhkan toMeEntity — sengaja minimal, bukan `User` utuh. */
type MeRow = {
  role: Role;
  consentAt: Date | null;
  ssoSubject: string;
  [key: string]: unknown;
};

/**
 * Satu-satunya tempat MeEntity dibangun (2026-08-27), dipakai `getMe` MAUPUN
 * `devLogin`. Dua field turunannya dihitung DI SINI, bukan sebagai getter di
 * MeEntity: menyandarkannya pada perilaku class-transformer terhadap accessor
 * berarti keduanya bisa diam-diam hilang dari respons kalau strategi
 * serialisasi berubah.
 */
function toMeEntity(row: MeRow): MeEntity {
  return new MeEntity({
    ...row,
    consentRequired: ConsentService.isRequired(row.role, row.consentAt),
    ssoLinked: isSsoLinked(row.ssoSubject),
  } as Partial<MeEntity>);
}
