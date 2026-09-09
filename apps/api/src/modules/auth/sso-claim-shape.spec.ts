import { bentukKlaim } from './sso-claim-shape';

/**
 * BENTUK klaim Helpdesk tanpa isinya (9 September 2026).
 *
 * Uji terpenting di berkas ini bukan yang memeriksa formatnya, melainkan
 * `TIDAK membocorkan satu pun nilai`. Fungsi ini ada untuk dituliskan ke log,
 * dan log adalah tempat yang tak punya masa retensi serta biasanya terbaca
 * lebih banyak orang daripada basis datanya sendiri. Fungsi yang bocor tetap
 * akan lulus seluruh uji format.
 */
describe('bentukKlaim', () => {
  it('melaporkan tipe & panjang string, bukan isinya', () => {
    const hasil = bentukKlaim({ sub: 'abc123', name: 'Budi Santoso' });

    expect(hasil).toContain('sub=string(6)');
    expect(hasil).toContain('name=string(12)');
  });

  it('menandai klaim yang tidak ada sebagai TIDAK ADA, bukan menghilangkannya', () => {
    // "tidak disebut" dan "tidak ada" adalah dua keadaan berbeda, dan justru
    // keadaan kedua yang menjadi jawaban atas pertanyaan `email_verified`.
    const hasil = bentukKlaim({ sub: 'abc' });

    expect(hasil).toContain('email_verified=TIDAK ADA');
    expect(hasil).toContain('groups=TIDAK ADA');
    expect(hasil).toContain('role=TIDAK ADA');
  });

  it('menampilkan NILAI boolean, karena itulah jawaban yang dicari', () => {
    expect(bentukKlaim({ email_verified: true })).toContain('email_verified=boolean(true)');
    expect(bentukKlaim({ email_verified: false })).toContain('email_verified=boolean(false)');
  });

  it('membedakan null dari tidak ada', () => {
    // Penyedia yang mengirim `null` sudah menyatakan sesuatu; yang tak
    // mengirim apa pun belum. Bedanya menentukan tafsir penjaga penautan.
    expect(bentukKlaim({ email_verified: null })).toContain('email_verified=null');
    expect(bentukKlaim({})).toContain('email_verified=TIDAK ADA');
  });

  it('larik dilaporkan beserta jumlah unsur & tipe unsurnya', () => {
    // INI pertanyaan yang menghalangi `HELPDESK_SSO_OPD_CLAIM`: apakah `groups`
    // berisi string atau objek?
    expect(bentukKlaim({ groups: ['dinkes', 'kominfo'] })).toContain(
      'groups=array[2] of string(6)',
    );
    expect(bentukKlaim({ groups: [] })).toContain('groups=array[0]');
  });

  it('larik objek dilaporkan beserta NAMA kuncinya saja', () => {
    const hasil = bentukKlaim({ groups: [{ id: 3, nama: 'Dinas Kesehatan' }] });

    expect(hasil).toContain('groups=array[1] of object{id,nama}');
    expect(hasil).not.toContain('Dinas Kesehatan');
  });

  it('objek dilaporkan beserta nama kuncinya, angka tanpa nilainya', () => {
    const hasil = bentukKlaim({ role: { level: 4, label: 'admin' } });

    expect(hasil).toContain('role=object{level,label}');
    // Angka ikut dirahasiakan: angka pada payload identitas lazimnya pengenal.
    expect(hasil).not.toContain('4');
    expect(hasil).not.toContain('admin');
  });

  it('klaim di luar daftar yang dicari TETAP dilaporkan, menurut abjad', () => {
    // Klaim yang memuat OPD boleh jadi bernama sesuatu yang belum terpikir.
    // Menyaringnya di sini akan menyembunyikan justru jawaban yang dicari.
    const hasil = bentukKlaim({ sub: 'a', zeta: 'x', alfa: 'y' });

    expect(hasil.indexOf('alfa=')).toBeGreaterThan(hasil.indexOf('sub='));
    expect(hasil.indexOf('zeta=')).toBeGreaterThan(hasil.indexOf('alfa='));
  });

  it('urutannya tetap walau urutan kunci penyedia berbeda', () => {
    // Keluaran yang urutannya tetap dapat dibandingkan antar login dan antar
    // lingkungan.
    const a = bentukKlaim({ role: 'x', sub: 'abc', groups: ['g'] });
    const b = bentukKlaim({ groups: ['g'], sub: 'abc', role: 'x' });

    expect(a).toBe(b);
  });

  it('TIDAK membocorkan satu pun nilai', () => {
    // Uji INTI. Setiap nilai di bawah dibuat mudah dikenali, lalu dipastikan
    // tak satu pun muncul di keluarannya.
    const hasil = bentukKlaim({
      sub: 'PENANDA-SUB-RAHASIA',
      email: 'budi.santoso@madiunkab.go.id',
      name: 'Budi Santoso',
      preferred_username: 'bsantoso',
      groups: ['dinas-kesehatan-kabupaten-madiun'],
      role: 'kepala-dinas',
      nik: '3519012345670001',
      bersarang: { alamat: 'Jalan Merdeka 17', telepon: '081234567890' },
    });

    for (const rahasia of [
      'PENANDA-SUB-RAHASIA',
      'budi.santoso@madiunkab.go.id',
      'Budi Santoso',
      'bsantoso',
      'dinas-kesehatan-kabupaten-madiun',
      'kepala-dinas',
      '3519012345670001',
      'Jalan Merdeka 17',
      '081234567890',
    ]) {
      expect(hasil).not.toContain(rahasia);
    }

    // KONTROL: pastikan uji di atas tidak lulus hanya karena keluarannya kosong
    // atau tak memuat klaim-klaim itu sama sekali.
    expect(hasil).toContain('sub=string(19)');
    expect(hasil).toContain('nik=string(16)');
    expect(hasil).toContain('bersarang=object{alamat,telepon}');
  });

  it('kedalaman dibatasi supaya payload bersarang dalam tak membanjiri log', () => {
    const hasil = bentukKlaim({ a: { b: { c: { d: 'terlalu dalam' } } } });

    expect(hasil).not.toContain('terlalu dalam');
    expect(hasil).toContain('a=object{b}');
  });

  it('jumlah kunci dibatasi dan sisanya dihitung', () => {
    const banyak: Record<string, unknown> = {};
    for (let i = 0; i < 15; i += 1) banyak[`k${i}`] = 'x';

    const hasil = bentukKlaim({ role: banyak });

    expect(hasil).toContain('+3}');
  });

  it('tidak meledak pada masukan yang bukan objek', () => {
    // Klaim datang dari jaringan. Bentuk yang tak terduga harus menghasilkan
    // laporan, bukan galat yang menggagalkan login.
    for (const buruk of [null, undefined, [] as unknown, 'bukan objek' as unknown]) {
      const hasil = bentukKlaim(buruk as Record<string, unknown>);
      expect(hasil).toContain('sub=TIDAK ADA');
      expect(hasil).not.toContain('bukan objek');
    }
  });
});
