import { ambilIdentitasKlaim, BATAS_ALAMAT, BATAS_NIK } from './sso-identitas.mapper';

/**
 * Pembacaan NIK, nomor HP, dan alamat dari klaim Helpdesk (1 Oktober 2026).
 *
 * DUA BENTUK, DAN ITU BUKAN DUGAAN. Pengguna mengirim dua payload sungguhan
 * dari penyedia yang sama, dan keduanya BERBEDA BENTUK:
 *
 *   GET /api/oauth/userinfo (ASN)        -> BERSARANG: demographics.nik,
 *                                           location.alamat,
 *                                           identity.phone_number
 *   GET /api/me             (masyarakat) -> RATA: nik, alamat, phone_number
 *
 * Karena itu tiap medan punya RANTAI CADANGAN, bersarang dahulu lalu rata.
 * Bentuk `userinfo` untuk masyarakat belum pernah terlihat; rantai ini membuat
 * jawabannya tak perlu ditunggu, sebab kedua bentuk yang benar-benar pernah
 * diukur sama-sama terbaca.
 */
describe('ambilIdentitasKlaim', () => {
  /** Bentuk `userinfo`, hanya cabang yang dibaca jalur ini. */
  const userinfoAsn = {
    sub: 'uuid-asn',
    identity: { name: 'Nama Lengkap', phone_number: '081234567890', user_type: 'asn' },
    employment: { nip: '198501012010011001' },
    demographics: { nik: '3507123456789012', kk: '3507123456789013' },
    location: { alamat: 'Jl. Pahlawan No. 1', rt: '001', rw: '002' },
  };

  /** Bentuk `/api/me`, memakai nilai & kekosongan sebagaimana diterima. */
  const apiMeMasyarakat = {
    nik: '3520041502050002',
    phone_number: '+62895396662038',
    alamat: 'Dusun Timang Desa Waduk RT.004/RW.001',
    nip: null,
    instansi: '',
  };

  it('membaca ketiganya dari payload userinfo yang bersarang', () => {
    expect(ambilIdentitasKlaim(userinfoAsn)).toEqual({
      nik: '3507123456789012',
      nomorHp: '081234567890',
      alamat: 'Jl. Pahlawan No. 1',
    });
  });

  it('membaca ketiganya dari payload rata ala /api/me', () => {
    expect(ambilIdentitasKlaim(apiMeMasyarakat)).toEqual({
      nik: '3520041502050002',
      nomorHp: '+62895396662038',
      alamat: 'Dusun Timang Desa Waduk RT.004/RW.001',
    });
  });

  it('mengutamakan jalur bersarang ketika kedua bentuk hadir sekaligus', () => {
    const campuran = {
      demographics: { nik: 'DARI-BERSARANG' },
      nik: 'DARI-RATA',
    };
    expect(ambilIdentitasKlaim(campuran).nik).toBe('DARI-BERSARANG');
  });

  /**
   * STRING KOSONG ADALAH KEKOSONGAN, bukan nilai. Respons `/api/me` sungguhan
   * memakai `''` untuk `instansi`, `jabatan`, dan `profile_picture` sementara
   * memakai `null` untuk `nip` — dua cara menyatakan hal yang sama dalam satu
   * payload. Tanpa aturan ini, kartu "Profil Pelapor" akan menggambar baris
   * kosong yang justru menjadi keluhan yang melahirkan pekerjaan ini.
   */
  it('memperlakukan string kosong sebagai tidak ada', () => {
    expect(ambilIdentitasKlaim({ nik: '', phone_number: '', alamat: '' })).toEqual({
      nik: null,
      nomorHp: null,
      alamat: null,
    });
  });

  it('memperlakukan string berisi spasi saja sebagai tidak ada', () => {
    expect(ambilIdentitasKlaim({ nik: '   ', alamat: '\t\n' })).toEqual({
      nik: null,
      nomorHp: null,
      alamat: null,
    });
  });

  it('memangkas spasi di tepi nilai yang terisi', () => {
    expect(ambilIdentitasKlaim({ nik: '  3507123456789012  ' }).nik).toBe('3507123456789012');
  });

  it('memperlakukan null sebagai tidak ada', () => {
    expect(ambilIdentitasKlaim({ nik: null, phone_number: null, alamat: null })).toEqual({
      nik: null,
      nomorHp: null,
      alamat: null,
    });
  });

  it('mengembalikan null untuk seluruh medan ketika seksinya tak ada sama sekali', () => {
    expect(ambilIdentitasKlaim({ sub: 'uuid', email: 'a@b.c' })).toEqual({
      nik: null,
      nomorHp: null,
      alamat: null,
    });
  });

  it('tidak melempar ketika klaimnya undefined atau null', () => {
    expect(ambilIdentitasKlaim(undefined)).toEqual({ nik: null, nomorHp: null, alamat: null });
    expect(ambilIdentitasKlaim(null)).toEqual({ nik: null, nomorHp: null, alamat: null });
  });

  /**
   * BUKAN STRING DITOLAK, TIDAK DIUBAH JADI STRING. NIK yang dikirim sebagai
   * angka JSON sudah kehilangan nol di depannya sebelum kode ini melihatnya,
   * dan 16 digit berada di dekat batas aman `Number`. Nomor identitas yang
   * salah satu digitnya berubah lebih berbahaya daripada baris yang kosong,
   * sebab yang kosong terlihat sedangkan yang salah tidak.
   */
  it('menolak nilai yang bukan string alih-alih memaksanya jadi string', () => {
    expect(
      ambilIdentitasKlaim({ nik: 3507123456789012, phone_number: 81234567890, alamat: true }),
    ).toEqual({ nik: null, nomorHp: null, alamat: null });
  });

  it('menolak nilai berbentuk larik maupun objek', () => {
    expect(ambilIdentitasKlaim({ nik: ['3507'], alamat: { jalan: 'Pahlawan' } })).toEqual({
      nik: null,
      nomorHp: null,
      alamat: null,
    });
  });

  /**
   * Pemotongan ini TAK PERNAH mengenai data sungguhan: NIK 16 digit dan nomor
   * HP 15 digit jauh di bawah batasnya. Ia ada supaya satu payload tak wajar
   * tak dapat menumbuhkan kolom basis data tanpa batas, bukan untuk menyaring
   * bentuk yang sah.
   */
  it('memotong nilai yang jauh lebih panjang daripada bentuk yang mungkin', () => {
    const hasil = ambilIdentitasKlaim({
      nik: '1'.repeat(BATAS_NIK + 50),
      alamat: 'A'.repeat(BATAS_ALAMAT + 50),
    });
    expect(hasil.nik).toHaveLength(BATAS_NIK);
    expect(hasil.alamat).toHaveLength(BATAS_ALAMAT);
  });
});
