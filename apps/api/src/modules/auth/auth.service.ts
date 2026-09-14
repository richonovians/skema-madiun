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

    // Jalur dev TIDAK boleh menjadi jalan memperoleh hak yang tak dimiliki:
    // ia menerbitkan sesi untuk email mana pun tanpa kata sandi.
    if (dto.role && !row.roles.includes(dto.role)) {
      throw new ForbiddenException('Akun tersebut tidak memiliki peran yang diminta');
    }

    await this.prisma.user.update({ where: { id: row.id }, data: { lastLoginAt: new Date() } });
    // Dicatat SETELAH kedua penolakan di atas: login gagal tak punya aktor untuk
    // ditunjuk (`audit_logs.actor_id` NOT NULL), jadi kegagalan tetap hanya masuk
    // log aplikasi. Lihat catatan di AuthController.logout.
    await this.audit.record(row.id, 'login', 'auth', { via: 'dev-login' });

    const token = this.sessionService.issue(row.id, dto.role);
    // Peran yang dipakai sesi ini: yang diminta, atau -- bila akunnya ber-role
    // tunggal -- satu-satunya yang ada. `null` berarti "belum memilih", dan
    // frontend memakainya untuk mengarahkan ke /pilih-peran.
    const actingRole = dto.role ?? (row.roles.length === 1 ? row.roles[0] : null);
    // Lewat helper yang SAMA dengan getMe: sebelumnya `new MeEntity(row)`
    // langsung, sehingga `consentRequired` & `ssoLinked` tak pernah terisi di
    // jalur dev-login dan frontend tak tahu harus mengarahkan ke persetujuan.
    return new SessionEntity({ token, user: toMeEntity(row, actingRole) });
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

  /**
   * Role yang DIMILIKI akun, untuk menyusun pemilih peran (6 September 2026).
   *
   * Ada karena `GET /auth/me` TIDAK dapat dipakai untuk keperluan ini: endpoint
   * itu menolak 401 justru ketika peran belum dipilih, sehingga halaman
   * /pilih-peran tak akan pernah bisa memuat daftar pilihannya -- ayam dan
   * telur, ditemukan saat verifikasi di peramban.
   *
   * SENGAJA minimal, bukan /auth/me kedua: hanya yang dibutuhkan pemilih peran.
   * `actingRole` TIDAK disertakan -- pada jalur ini perannya memang belum
   * ditentukan, dan mengarang nilainya hanya akan menyesatkan pemanggil.
   *
   * `consentRequired` dihitung dari role tunggal bila memang cuma satu (jalur
   * callback SSO memakainya untuk menyimpan sesi dalam satu panggilan); untuk
   * akun ber-role banyak nilainya false, dan itu benar -- ia belum dapat
   * mengirim apa pun sebelum memilih peran.
   */
  async getRoles(user: CurrentUser): Promise<{
    nama: string;
    roles: Role[];
    opdId: number | null;
    consentRequired: boolean;
  }> {
    const row = await this.prisma.user.findFirst({
      where: { id: user.userId, deletedAt: null },
      select: { nama: true, roles: true, opdId: true, consentAt: true },
    });
    if (!row) {
      throw new NotFoundException('Pengguna tidak ditemukan');
    }
    const satuRole = row.roles.length === 1 ? row.roles[0] : null;
    return {
      nama: row.nama,
      roles: row.roles,
      opdId: row.opdId,
      consentRequired: satuRole ? ConsentService.isRequired(satuRole, row.consentAt) : false,
    };
  }

  /**
   * Ganti peran yang sedang dipakai TANPA logout (5 September 2026).
   *
   * Kepemilikan diperiksa dari `user.roles`, yaitu hasil pembacaan basis data
   * pada permintaan ini (lihat SessionAuthProvider) -- bukan dari klaim token,
   * yang bisa saja menyebut role yang sudah dicabut.
   *
   * Mengembalikan token beserta `consentRequired` UNTUK PERAN YANG BARU; masa
   * berlakunya dihitung controller lewat SessionCookieService.
   *
   * `consentRequired` ditambahkan 14 September 2026 (laporan pengguna: akun
   * warga ber-peran banyak yang belum menyetujui PDP tetap dipantulkan dari
   * /persetujuan). Saat login, akun ber-peran banyak belum punya `actingRole`
   * sehingga `consentRequired` bernilai false -- artinya "belum dapat
   * ditentukan", BUKAN "sudah menyetujui". Frontend menulis cookie `consent`
   * dari nilai itu, dan tanpa medan ini tak ada apa pun yang mengoreksinya
   * ketika perannya akhirnya dipilih.
   */
  async setActingRole(
    user: CurrentUser,
    role: Role,
  ): Promise<{ token: string; consentRequired: boolean }> {
    if (!user.roles.includes(role)) {
      throw new ForbiddenException('Akun Anda tidak memiliki peran tersebut');
    }
    if (role === Role.opd && user.opdId == null) {
      throw new BadRequestException(
        'Akun Anda belum tertaut OPD, sehingga tidak dapat bertindak sebagai Admin OPD',
      );
    }

    // Peran non-responden keluar SEBELUM kueri apa pun, sama seperti
    // ConsentService.assertConsented: mereka tak pernah dimintai persetujuan,
    // jadi tak ada alasan membebani perpindahan peran dengan satu perjalanan
    // ke basis data.
    let consentRequired = false;
    if (role === Role.responden) {
      const row = await this.prisma.user.findFirst({
        where: { id: user.userId, deletedAt: null },
        select: { consentAt: true },
      });
      consentRequired = ConsentService.isRequired(role, row?.consentAt ?? null);
    }

    return { token: this.sessionService.issue(user.userId, role), consentRequired };
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
    return toMeEntity(row, user.actingRole);
  }

  /** Ubah nama (semua peran) + demografis (khusus responden). Data dipakai ulang antar survei. */
  async updateProfile(user: CurrentUser, dto: UpdateProfileDto): Promise<MeEntity> {
    if (dto.nama !== undefined) {
      await this.prisma.user.update({ where: { id: user.userId }, data: { nama: dto.nama } });
    }

    if (user.actingRole === Role.responden) {
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
  roles: Role[];
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
function toMeEntity(row: MeRow, actingRole: Role | null): MeEntity {
  return new MeEntity({
    ...row,
    actingRole,
    // Dihitung dari peran yang DIPAKAI, bukan dari kepemilikan: persetujuan UU
    // PDP hanya berlaku bagi warga, dan seseorang ber-role banyak baru menjadi
    // warga ketika ia memilih peran itu.
    //
    // `actingRole` null (akun ber-role banyak yang belum memilih) menghasilkan
    // `false`, dan itu benar: ia belum dapat mengirim apa pun. Begitu ia memilih
    // `responden`, /auth/me berikutnya menghitungnya ulang dengan benar.
    consentRequired: actingRole ? ConsentService.isRequired(actingRole, row.consentAt) : false,
    ssoLinked: isSsoLinked(row.ssoSubject),
  } as Partial<MeEntity>);
}
