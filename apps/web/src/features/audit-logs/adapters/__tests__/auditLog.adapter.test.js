import { aksiLabel, entitasLabel } from '../auditLog.adapter';
import { ACTION_OPTIONS, MODULE_OPTIONS } from '../../components/AuditFilterBar';

/**
 * 13 September 2026, menyertai pembukaan audit untuk aktivitas warga.
 *
 * Sebelum ini `ENTITAS_LABEL` hanya memuat lima modul admin, padahal 315 baris
 * `auth` (login/logout/consent warga) SUDAH ada di basis data dan tampil
 * sebagai teks mentah "auth" -- serta tak dapat disaring, karena dropdown
 * "Modul" pun tak memuatnya. Tiga entitas baru menyusul bersama dekorator
 * `@Audit` yang baru dipasang.
 */
describe('label log aktivitas', () => {
  it.each([
    ['auth', 'Autentikasi'],
    ['response', 'Jawaban Survei'],
    ['complaint_reply', 'Balasan Pengaduan'],
  ])('entitas "%s" punya label Indonesia, bukan teks mentah', (entitas, label) => {
    expect(entitasLabel(entitas)).toBe(label);
  });

  it('label modul lama tidak berubah', () => {
    expect(entitasLabel('complaint')).toBe('Pengaduan');
    expect(entitasLabel('survey')).toBe('Survei');
    expect(entitasLabel('user')).toBe('Pengguna');
  });

  it('entitas tak dikenal tetap jatuh ke teks aslinya, bukan kosong', () => {
    expect(entitasLabel('entitas_baru_kelak')).toBe('entitas_baru_kelak');
  });

  /**
   * Saringan yang tak memuat seluruh entitas yang benar-benar tercatat membuat
   * baris itu mustahil ditemukan pada halaman yang berisi ribuan entri.
   */
  it('dropdown Modul memuat setiap entitas yang kini dapat tercatat', () => {
    const nilai = MODULE_OPTIONS.map((o) => o.value);

    for (const entitas of [
      'auth',
      'complaint',
      'complaint_reply',
      'opd',
      'question',
      'response',
      'survey',
      'user',
    ]) {
      expect(nilai).toContain(entitas);
    }
    // Opsi pertama tetap "semua": tanpa itu pengguna tak bisa kembali ke daftar penuh.
    expect(MODULE_OPTIONS[0].value).toBe('');
  });

  it('setiap opsi Modul memakai label yang sama dengan tabelnya', () => {
    for (const opsi of MODULE_OPTIONS.filter((o) => o.value !== '')) {
      expect(opsi.label).toBe(entitasLabel(opsi.value));
    }
  });
});

/**
 * SELURUH LABEL AKSI BERBAHASA INDONESIA (6 Oktober 2026, permintaan pengguna).
 *
 * Keadaan sebelum ini, dan sebabnya permintaan itu masuk akal: petanya CAMPUR
 * BAHASA -- `CREATE`, `LOGIN`, dan `UPDATE STATUS` bersebelahan dengan
 * `PERSETUJUAN PDP` dan `UBAH PROFIL` -- sementara aturan repo menyatakan teks
 * antarmuka berbahasa Indonesia. Kecampurannya itu sendiri yang menjadi
 * cacatnya, bukan sekadar lima aksi yang belum berlabel.
 *
 * Terukur dari kode pada hari yang sama: 17 aksi dapat tercatat, 12 berlabel,
 * dan 5 jatuh ke jalur cadangan `aksi.toUpperCase()` -- `forward`, `restore`,
 * `purge`, `sso_grant_kabupaten`, `sso_cabut_peran_opd`. Kelimanya juga tak ada
 * di penyaring, sehingga baris-barisnya tak dapat dicari sama sekali.
 */
describe('label aksi log aktivitas: seluruhnya bahasa Indonesia', () => {
  /**
   * Daftar ini DITURUNKAN DARI KODE BACKEND, bukan dari basis data: aksi yang
   * belum pernah terjadi tetap dapat terjadi besok, dan `select distinct aksi`
   * tak akan pernah menyebutkannya. Tiga sumbernya:
   *
   *   - `AuditInterceptor` menurunkan `create`/`update`/`delete` dari metode HTTP
   *   - `@Audit('entitas', 'aksi')` pada controller
   *   - `AuditService.record(..., 'aksi', ...)` langsung di service
   */
  const SEMUA_AKSI = [
    'create',
    'update',
    'delete',
    'update_status',
    'update_profile',
    'login',
    'logout',
    'consent',
    'sync',
    'apply_template',
    'reorder',
    'duplicate',
    'forward',
    'restore',
    'purge',
    'sso_grant_kabupaten',
    'sso_cabut_peran_opd',
  ];

  it.each([
    ['create', 'BUAT'],
    ['update', 'UBAH'],
    ['delete', 'HAPUS'],
    ['update_status', 'UBAH STATUS'],
    ['login', 'MASUK'],
    ['logout', 'KELUAR'],
    ['sync', 'SINKRONISASI'],
    ['apply_template', 'TERAPKAN TEMPLATE'],
    ['reorder', 'UBAH URUTAN'],
    ['duplicate', 'DUPLIKAT'],
  ])('aksi "%s" kini berbahasa Indonesia: "%s"', (aksi, label) => {
    expect(aksiLabel(aksi)).toBe(label);
  });

  it.each([
    ['forward', 'TERUSKAN KE OPD'],
    ['restore', 'PULIHKAN'],
    ['purge', 'MUSNAHKAN'],
    ['sso_grant_kabupaten', 'SSO BERI PERAN KABUPATEN'],
    ['sso_cabut_peran_opd', 'SSO CABUT PERAN ADMIN OPD'],
  ])('aksi "%s" tak lagi tampil sebagai teks mentah: "%s"', (aksi, label) => {
    expect(aksiLabel(aksi)).toBe(label);
  });

  it('dua label Indonesia yang sudah ada TIDAK bergeser', () => {
    expect(aksiLabel('consent')).toBe('PERSETUJUAN PDP');
    expect(aksiLabel('update_profile')).toBe('UBAH PROFIL');
  });

  it('tak ada satu pun aksi yang masih jatuh ke jalur cadangan', () => {
    // Jalur cadangan `aksi.toUpperCase()` menghasilkan nama kunci basis data
    // apa adanya -- `SSO_CABUT_PERAN_OPD`. Uji ini yang menangkap aksi BARU
    // yang kelak ditambahkan tanpa label.
    for (const aksi of SEMUA_AKSI) {
      expect(aksiLabel(aksi)).not.toBe(aksi.toUpperCase());
    }
  });

  it('aksi tak dikenal tetap jatuh ke teks aslinya, bukan kosong', () => {
    // Jalur cadangannya DIPERTAHANKAN. Aksi yang kelak lahir di backend lebih
    // baik terbaca sebagai kunci mentah daripada menghilang dari layar.
    expect(aksiLabel('aksi_baru_kelak')).toBe('AKSI_BARU_KELAK');
  });

  /**
   * Penyaring yang tak memuat seluruh aksi yang benar-benar tercatat membuat
   * baris itu mustahil ditemukan pada halaman berisi ribuan entri. Dua di
   * antaranya -- `sso_grant_kabupaten` dan `sso_cabut_peran_opd` -- adalah
   * perubahan HAK AKSES yang terjadi tanpa ada manusia menekan apa pun, dan
   * justru itu yang dicari seorang pemeriksa.
   */
  it('penyaring Aksi memuat setiap aksi yang kini dapat tercatat', () => {
    const nilai = ACTION_OPTIONS.map((o) => o.value);

    for (const aksi of SEMUA_AKSI) {
      expect(nilai).toContain(aksi);
    }
    expect(ACTION_OPTIONS[0].value).toBe('');
  });

  it('setiap opsi Aksi memakai label yang sama dengan tabelnya', () => {
    for (const opsi of ACTION_OPTIONS.filter((o) => o.value !== '')) {
      expect(opsi.label).toBe(aksiLabel(opsi.value));
    }
  });
});
