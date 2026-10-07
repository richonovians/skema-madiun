import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JenisKelamin, JenisPengguna, Role } from '@prisma/client';
import { instanceToPlain } from 'class-transformer';
import type { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuditService } from '../audit/audit.service';
import { enkripsiKolom } from '../../common/crypto/kolom';
import { AuthService } from './auth.service';
import type { PenerbitSesi } from './session/penerbit-sesi.service';
import { PenyimpanSesiMemori } from './session/penyimpan-sesi.memori';

const cu = (actingRole: Role, userId = 1, over: Partial<CurrentUser> = {}): CurrentUser => ({
  userId,
  roles: [actingRole],
  actingRole,
  opdId: null,
  ...over,
});

const userRow = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  ssoSubject: 'x',
  nama: 'A',
  email: 'a@x.go.id',
  roles: [Role.kabupaten],
  opdId: null,
  isActive: true,
  lastLoginAt: null,
  consentAt: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  respondentProfile: null,
  // Keempat kolom ini lahir 1 Oktober 2026 dan ikut terbaca `getMe` karena
  // kueri-nya tanpa `select`. Ditulis TERSURAT sebagai null supaya fixture ini
  // mewakili akun yang BELUM pernah login ulang -- keadaan seluruh akun yang
  // sudah ada saat kolomnya dibuat.
  nik: null,
  nomorHp: null,
  alamat: null,
  jenisKelamin: null,
  ...overrides,
});

describe('AuthService', () => {
  const prisma = {
    user: { findFirst: jest.fn(), update: jest.fn() },
    respondentProfile: { findUnique: jest.fn(), update: jest.fn(), create: jest.fn() },
  } as unknown as PrismaService;
  const audit = { record: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;
  /** Kunci uji untuk kolom terenkripsi `users.nik` / `nomor_hp` / `alamat`. */
  const KUNCI_UJI_KOLOM = Buffer.alloc(32, 0xd);
  const config = {
    get: jest.fn((kunci: string) =>
      kunci === 'crypto.dataKey' ? KUNCI_UJI_KOLOM.toString('hex') : undefined,
    ),
  } as unknown as ConfigService;
  // `PenerbitSesi` menggantikan `SessionService` di sini (7 Oktober 2026):
  // penerbitan sesi kini sekaligus mendaftarkannya ke daftar pencabutan.
  const penerbitSesi = {
    terbitkan: jest.fn().mockResolvedValue('signed.jwt.token'),
  } as unknown as PenerbitSesi;
  const service = new AuthService(prisma, penerbitSesi, audit, config, new PenyimpanSesiMemori());

  beforeEach(() => jest.clearAllMocks());

  /**
   * Audit login (celah 3, 2026-08-27). Sebelumnya yang tercatat cuma
   * `lastLoginAt` — SATU nilai yang tertimpa setiap login, jadi tak ada riwayat
   * "siapa masuk kapan" sama sekali. Untuk sistem RBAC pemerintahan itu jejak
   * yang biasanya diminta auditor.
   */
  describe('audit login', () => {
    it('devLogin mencatat aksi login dengan penanda jalurnya', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(userRow());
      (prisma.user.update as jest.Mock).mockResolvedValue(userRow());

      await service.devLogin({ identifier: 'a@x.go.id' });

      expect(audit.record).toHaveBeenCalledWith(1, 'login', 'auth', { via: 'dev-login' });
    });

    it('login yang GAGAL tidak dicatat (tak ada aktor untuk ditunjuk)', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.devLogin({ identifier: 'tak-ada' })).rejects.toThrow(NotFoundException);
      expect(audit.record).not.toHaveBeenCalled();
    });

    it('akun nonaktif ditolak tanpa dicatat sebagai login', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(userRow({ isActive: false }));

      await expect(service.devLogin({ identifier: 'a@x.go.id' })).rejects.toThrow(
        ForbiddenException,
      );
      expect(audit.record).not.toHaveBeenCalled();
    });
  });

  /**
   * `consentRequired` (celah 2, 2026-08-27) diekspos sebagai boolean, BUKAN
   * `consentAt`-nya: yang dibutuhkan antarmuka cuma "sudah atau belum", sementara
   * tanggal persetujuan adalah data pribadi yang tak ada gunanya dikirim ke klien.
   */
  describe('getMe.consentRequired', () => {
    it.each([
      [Role.responden, null, true],
      [Role.responden, new Date(), false],
      [Role.kabupaten, null, false],
      [Role.opd, null, false],
    ])('%s dengan consentAt=%s -> %s', async (role, consentAt, harapan) => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(userRow({ role, consentAt }));

      const me = await service.getMe(cu(role));

      expect(me.consentRequired).toBe(harapan);
    });

    /**
     * devLogin memakai jalur pembangunan MeEntity yang SAMA dengan getMe.
     * Sebelum ini ia memanggil `new MeEntity(row)` langsung, sehingga
     * `consentRequired` & `ssoLinked` undefined — dan frontend yang membaca
     * hasil dev-login tak bisa tahu harus mengarahkan ke halaman persetujuan.
     */
    it('devLogin melaporkan consentRequired & ssoLinked, sama seperti getMe', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(
        userRow({ roles: [Role.responden], consentAt: null, ssoSubject: 'seed-responden' }),
      );
      (prisma.user.update as jest.Mock).mockResolvedValue(userRow());

      const sesi = await service.devLogin({ identifier: 'a@x.go.id' });

      expect(sesi.user.consentRequired).toBe(true);
      expect(sesi.user.ssoLinked).toBe(false);
    });

    /**
     * JALUR KEDUA kolom `jenis_pengguna` keluar ke klien, dan ia tidak terlihat
     * dari `getMe`: `devLogin` membungkus `MeEntity` di dalam `SessionEntity`,
     * jadi yang harus bekerja adalah `@Exclude()` pada entity BERSARANG.
     * Penahan yang benar di satu jalur tak membuktikan apa pun tentang jalur
     * lain -- dan respons dev-login inilah yang dibaca frontend saat masuk.
     */
    it('jenis pengguna TIDAK bocor lewat SessionEntity dev-login', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(
        userRow({ jenisPengguna: JenisPengguna.asn }),
      );
      (prisma.user.update as jest.Mock).mockResolvedValue(userRow());

      const sesi = await service.devLogin({ identifier: 'a@x.go.id' });
      const keluar = instanceToPlain(sesi) as { user: Record<string, unknown> };

      expect(keluar.user).not.toHaveProperty('jenisPengguna');
    });

    it('consentAt sendiri TIDAK ikut keluar', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(
        userRow({ roles: [Role.responden], consentAt: new Date() }),
      );

      const me = await service.getMe(cu(Role.responden));

      // Ditandai @Exclude() di MeEntity; dipastikan di sini supaya tak diam-diam
      // ikut terekspos saat field baru ditambahkan di sekitarnya.
      expect(Object.keys(instanceToPlain(me))).not.toContain('consentAt');
    });
  });

  /**
   * `ssoLinked` (celah 5, 2026-08-27). Ditentukan DI BACKEND, bukan dengan
   * frontend menebak pola string `seed-*`/`pending:*` dari `ssoSubject`:
   * bentuk penampung itu detail internal basis data, dan menyalinnya ke adapter
   * frontend berarti dua tempat harus ingat aturan yang sama.
   */
  describe('getMe.ssoLinked', () => {
    it.each([
      ['penampung seed', 'seed-responden', false],
      ['penampung pending', 'pending:budi@gmail.com', false],
      ['sub asli Helpdesk', 'e3152173-1ad7-424c-aed8-2cdf606a25c6', true],
      ['sub asli berbentuk angka', '10482', true],
    ])('%s -> %s', async (_nama, ssoSubject, harapan) => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(userRow({ ssoSubject }));

      const me = await service.getMe(cu(Role.responden));

      expect(me.ssoLinked).toBe(harapan);
    });
  });

  it('getMe mengembalikan MeEntity', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(userRow());
    const me = await service.getMe(cu(Role.kabupaten));
    expect(me.email).toBe('a@x.go.id');
  });

  it('getMe melempar NotFound bila pengguna tak ada', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(service.getMe(cu(Role.kabupaten))).rejects.toThrow(NotFoundException);
  });

  it('updateProfile responden: profil baru tak lengkap → BadRequest', async () => {
    (prisma.respondentProfile.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(
      service.updateProfile(cu(Role.responden), { jenisKelamin: JenisKelamin.laki_laki }),
    ).rejects.toThrow(BadRequestException);
  });

  it('updateProfile responden lengkap → create profil', async () => {
    (prisma.respondentProfile.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.respondentProfile.create as jest.Mock).mockResolvedValue({});
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(
      userRow({
        role: Role.responden,
        respondentProfile: {
          jenisKelamin: 'laki_laki',
          kelompokUmur: '20-29',
          pendidikan: 'S1',
          pekerjaan: 'Swasta',
        },
      }),
    );

    const me = await service.updateProfile(cu(Role.responden), {
      jenisKelamin: JenisKelamin.laki_laki,
      kelompokUmur: '20-29',
      pendidikan: 'S1',
      pekerjaan: 'Swasta',
    });

    expect(prisma.respondentProfile.create).toHaveBeenCalled();
    expect(me.respondentProfile?.pekerjaan).toBe('Swasta');
  });

  it('updateProfile non-responden dengan demografis → hanya update nama', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(userRow({ nama: 'B' }));

    await service.updateProfile(cu(Role.kabupaten), {
      nama: 'B',
      jenisKelamin: JenisKelamin.perempuan,
    });

    expect(prisma.user.update).toHaveBeenCalled();
    expect(prisma.respondentProfile.create).not.toHaveBeenCalled();
    expect(prisma.respondentProfile.update).not.toHaveBeenCalled();
  });

  describe('devLogin', () => {
    it('pengguna tak ditemukan (email/ssoSubject) → NotFound', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.devLogin({ identifier: 'tidak-ada' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('pengguna nonaktif → Forbidden', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(userRow({ isActive: false }));
      await expect(service.devLogin({ identifier: 'a@x.go.id' })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('sukses → menerbitkan token, memperbarui lastLoginAt, mencari via email ATAU ssoSubject', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(userRow());
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      const result = await service.devLogin({ identifier: 'A@X.GO.ID' });

      expect(result.token).toBe('signed.jwt.token');
      expect(result.user.email).toBe('a@x.go.id');
      // Argumen kedua (peran yang dipilih) `undefined` di sini: akun uji ini
      // ber-role tunggal dan permintaannya tak menyebut peran apa pun.
      expect(penerbitSesi.terbitkan).toHaveBeenCalledWith(1, undefined, undefined);
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 1 } }),
      );
      expect(prisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [{ email: 'a@x.go.id' }, { ssoSubject: 'A@X.GO.ID' }],
          }),
        }),
      );
    });
  });

  describe('logout', () => {
    it('mengembalikan konfirmasi sukses', async () => {
      // Kini asinkron: logout mencabut sesinya di penyimpan, tak lagi sekadar
      // menghapus cookie (7 Oktober 2026).
      await expect(service.logout()).resolves.toEqual({ success: true });
    });
  });

  /**
   * Ganti peran tanpa logout (5 September 2026). Kepemilikan diperiksa dari
   * `user.roles` -- hasil pembacaan basis data pada permintaan ini
   * (SessionAuthProvider), BUKAN dari klaim token yang bisa saja sudah basi.
   */
  describe('setActingRole', () => {
    it('menerbitkan sesi baru berisi klaim act yang diminta', async () => {
      (penerbitSesi.terbitkan as jest.Mock).mockResolvedValue('token-baru');

      const hasil = await service.setActingRole(
        cu(Role.kabupaten, 9, { roles: [Role.kabupaten, Role.opd], opdId: 1 }),
        Role.opd,
      );

      expect(penerbitSesi.terbitkan).toHaveBeenCalledWith(9, Role.opd, undefined);
      expect(hasil.token).toBe('token-baru');
    });

    it('MENOLAK role yang tidak dimiliki akun, tanpa menerbitkan apa pun', async () => {
      await expect(
        service.setActingRole(cu(Role.opd, 9, { roles: [Role.opd], opdId: 1 }), Role.kabupaten),
      ).rejects.toThrow(ForbiddenException);

      expect(penerbitSesi.terbitkan).not.toHaveBeenCalled();
    });

    it('MENOLAK role opd bila akun tak tertaut OPD', async () => {
      await expect(
        service.setActingRole(
          cu(Role.kabupaten, 9, { roles: [Role.kabupaten, Role.opd], opdId: null }),
          Role.opd,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('devLogin memilih peran', () => {
    it('meneruskan peran yang diminta ke penerbit token', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(
        userRow({ roles: [Role.kabupaten, Role.opd], opdId: 1 }),
      );
      (prisma.user.update as jest.Mock).mockResolvedValue(userRow());

      await service.devLogin({ identifier: 'a@x.go.id', role: Role.opd });

      expect(penerbitSesi.terbitkan).toHaveBeenCalledWith(1, Role.opd, undefined);
    });

    /**
     * Jalur dev TIDAK boleh menjadi jalan memperoleh hak yang tak dimiliki --
     * ia menerbitkan sesi untuk email mana pun tanpa kata sandi.
     */
    it('MENOLAK peran yang tak dimiliki akun', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(userRow({ roles: [Role.opd] }));

      await expect(
        service.devLogin({ identifier: 'a@x.go.id', role: Role.kabupaten }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('tanpa peran diminta & role TUNGGAL -> token tanpa klaim act', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(userRow({ roles: [Role.kabupaten] }));
      (prisma.user.update as jest.Mock).mockResolvedValue(userRow());

      await service.devLogin({ identifier: 'a@x.go.id' });

      expect(penerbitSesi.terbitkan).toHaveBeenCalledWith(1, undefined, undefined);
    });
  });
});

/**
 * IDENTITAS PADA GET /auth/me (1 Oktober 2026).
 *
 * KEBOCORAN YANG DIPERBAIKI, dan sebabnya pantas dicatat supaya tak terulang.
 * `getMe` memakai `findFirst` TANPA `select`, dan `toMeEntity` menyebar
 * `...row` ke `MeEntity` yang serialisasinya EXPOSE-ALL. Artinya setiap kolom
 * baru pada tabel `users` ikut keluar ke klien begitu kolomnya dibuat, tanpa
 * ada yang perlu menuliskannya di mana pun.
 *
 * Terukur sebelum perbaikan ini: respons memuat `nik`, `nomorHp`, dan `alamat`
 * sebagai SANDI MENTAH (`enc:v1:...`) beserta `jenisKelamin` -- keempatnya tak
 * pernah dideklarasikan pada entity, dan tak seorang pun memutuskan
 * mengirimkannya.
 */
describe('AuthService.getMe -- identitas dari akun', () => {
  const prisma = {
    user: { findFirst: jest.fn(), update: jest.fn() },
    respondentProfile: { findUnique: jest.fn(), update: jest.fn(), create: jest.fn() },
  } as unknown as PrismaService;
  const KUNCI = Buffer.alloc(32, 0xd);
  const service = new AuthService(
    prisma,
    { terbitkan: jest.fn().mockResolvedValue('token-sesi') } as unknown as PenerbitSesi,
    { record: jest.fn() } as unknown as AuditService,
    {
      get: jest.fn((k: string) => (k === 'crypto.dataKey' ? KUNCI.toString('hex') : undefined)),
    } as unknown as ConfigService,
    new PenyimpanSesiMemori(),
  );

  const barisBeridentitas = (over: Record<string, unknown> = {}) =>
    userRow({
      nik: enkripsiKolom('3520041502050002', KUNCI),
      nomorHp: enkripsiKolom('+62895396662038', KUNCI),
      alamat: enkripsiKolom('Dusun Timang Desa Waduk', KUNCI),
      jenisKelamin: JenisKelamin.perempuan,
      jenisPengguna: JenisPengguna.asn,
      ...over,
    });

  beforeEach(() => jest.clearAllMocks());

  it('mengirim ketiganya dalam keadaan TERDEKRIPSI', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(barisBeridentitas());

    const me = await service.getMe(cu(Role.responden));

    // PENUH pada jalur ini, berbeda dari jalur pengaduan yang menyamarkan di
    // backend: NIK ini milik pemilik sesi itu sendiri. Penyamarannya urusan
    // tampilan, lihat me.adapter.js.
    expect(me.nik).toBe('3520041502050002');
    expect(me.nomorHp).toBe('+62895396662038');
    expect(me.alamat).toBe('Dusun Timang Desa Waduk');
  });

  /**
   * Uji ini yang membedakan "terkirim" dari "terkirim dengan benar". Tanpa dia,
   * meneruskan sandi mentah apa adanya tetap lulus uji di atas -- sebab
   * `dekripsiKolom` mengembalikan teks polos apa adanya demi migrasi bertahap,
   * dan sandi mentah bukan teks polos melainkan blob yang terbaca sebagai
   * string biasa oleh pemanggil yang tak memeriksanya.
   */
  it('TIDAK pernah membocorkan sandi mentah ke klien', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(barisBeridentitas());

    const keluar = instanceToPlain(await service.getMe(cu(Role.responden)));

    for (const nilai of Object.values(keluar)) {
      expect(String(nilai)).not.toContain('enc:v1:');
    }
  });

  /**
   * MINIMAL YANG DIBUTUHKAN, bukan segala yang kebetulan ada di barisnya.
   * Halaman profil tidak menggambar jenis kelamin, dan medan yang terkirim
   * tanpa ada yang memakainya adalah data pribadi yang beredar tanpa sebab.
   */
  it('TIDAK mengirim jenis kelamin', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(barisBeridentitas());

    const keluar = instanceToPlain(await service.getMe(cu(Role.responden)));

    expect(keluar).not.toHaveProperty('jenisKelamin');
  });

  /**
   * Alasan yang sama seperti jenis kelamin di atas, dan kolomnya lahir dengan
   * jebakan yang sama: `jenis_pengguna` (6 Oktober 2026) ikut tersebar
   * `Object.assign` tanpa ada yang memutuskan mengirimkannya. Status kepegawaian
   * seseorang tak digambar satu pun layar dari endpoint ini; yang membutuhkan
   * aturan ASN adalah halaman manajemen pengguna, dan ia menerima
   * `bolehJadiAdminOpd` dari `GET /users` -- sebuah boolean, bukan statusnya.
   */
  it('TIDAK mengirim jenis pengguna (ASN atau warga)', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(barisBeridentitas());

    const keluar = instanceToPlain(await service.getMe(cu(Role.responden)));

    expect(keluar).not.toHaveProperty('jenisPengguna');
  });

  it('kolom yang kosong tetap null, bukan string kosong', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(
      barisBeridentitas({ nik: null, nomorHp: null, alamat: null }),
    );

    const me = await service.getMe(cu(Role.responden));

    expect(me.nik).toBeNull();
    expect(me.nomorHp).toBeNull();
    expect(me.alamat).toBeNull();
  });

  /**
   * Endpoint ini hanya pernah mengembalikan akun PEMANGGILNYA. Dijaga tersurat
   * karena ketiga medan yang baru ditambahkan membuat taruhannya naik: sebelum
   * ini, salah kueri berarti membocorkan nama; sesudahnya, NIK dan alamat.
   */
  it('hanya pernah membaca akun pemanggilnya sendiri', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(barisBeridentitas());

    await service.getMe(cu(Role.responden, 7));

    expect(prisma.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 7, deletedAt: null } }),
    );
  });
});

/**
 * PENCABUTAN SESI (7 Oktober 2026).
 *
 * Sebelum ini `logout` benar-benar tak mengubah apa pun di server: ia hanya
 * menghapus cookie, dan salinan cookie yang terlanjur keluar tetap sah sampai
 * pagu `abs` lewat. Docblock lama AuthService.logout menyebut keadaan itu
 * tersurat ("sesi lokal bersifat stateless").
 */
describe('AuthService — pencabutan sesi', () => {
  const buat = () => {
    const penyimpan = new PenyimpanSesiMemori();
    const service = new AuthService(
      { user: { findFirst: jest.fn(), update: jest.fn() } } as unknown as PrismaService,
      { terbitkan: jest.fn() } as unknown as PenerbitSesi,
      { record: jest.fn() } as unknown as AuditService,
      {
        get: jest.fn((k: string) =>
          k === 'crypto.dataKey' ? Buffer.alloc(32, 0xd).toString('hex') : undefined,
        ),
      } as unknown as ConfigService,
      penyimpan,
    );
    return { service, penyimpan };
  };

  const catatan = (uid: number) => ({ uid, abs: Math.floor(Date.now() / 1000) + 3600 });

  it('logout mencabut sesi yang memanggilnya', async () => {
    const { service, penyimpan } = buat();
    await penyimpan.simpan('sid-a', catatan(7));

    await service.logout('sid-a');

    await expect(penyimpan.hidup('sid-a')).resolves.toBe(false);
  });

  it('logout tanpa sid tetap berhasil, tanpa mencabut apa pun', async () => {
    // Token terbitan lama tak punya sid. Melemparkan galat di sini berarti
    // pemiliknya tak dapat keluar sama sekali.
    const { service, penyimpan } = buat();
    await penyimpan.simpan('sid-a', catatan(7));

    await expect(service.logout()).resolves.toEqual({ success: true });
    await expect(penyimpan.hidup('sid-a')).resolves.toBe(true);
  });

  it('keluarkan semua perangkat mencabut seluruh sesi akun itu saja', async () => {
    const { service, penyimpan } = buat();
    await penyimpan.simpan('sid-a', catatan(7));
    await penyimpan.simpan('sid-b', catatan(7));
    await penyimpan.simpan('sid-lain', catatan(8));

    await service.keluarkanSemuaPerangkat(7);

    await expect(penyimpan.hidup('sid-a')).resolves.toBe(false);
    await expect(penyimpan.hidup('sid-b')).resolves.toBe(false);
    await expect(penyimpan.hidup('sid-lain')).resolves.toBe(true);
  });

  it('daftar sesi menandai mana yang sedang dipakai pemanggilnya', async () => {
    // Tanpa penanda ini daftar perangkat tak dapat dibaca: pemiliknya tak tahu
    // baris mana yang akan ia putus bila menekan "keluarkan".
    const { service, penyimpan } = buat();
    await penyimpan.simpan('sid-a', catatan(7));
    await penyimpan.simpan('sid-b', catatan(7));

    const daftar = await service.daftarSesi(7, 'sid-b');

    expect(daftar.find((s) => s.sid === 'sid-b')?.iniSesiIni).toBe(true);
    expect(daftar.find((s) => s.sid === 'sid-a')?.iniSesiIni).toBe(false);
  });
});
