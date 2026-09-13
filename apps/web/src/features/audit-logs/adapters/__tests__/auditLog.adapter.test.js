import { aksiLabel, entitasLabel } from '../auditLog.adapter';
import { MODULE_OPTIONS } from '../../components/AuditFilterBar';

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

  it.each([
    ['login', 'LOGIN'],
    ['logout', 'LOGOUT'],
    ['consent', 'PERSETUJUAN PDP'],
    ['update_profile', 'UBAH PROFIL'],
  ])('aksi "%s" terbaca sebagai "%s"', (aksi, label) => {
    expect(aksiLabel(aksi)).toBe(label);
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
