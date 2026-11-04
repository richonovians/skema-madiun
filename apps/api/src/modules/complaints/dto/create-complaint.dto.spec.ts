import { TingkatPengaduan } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateComplaintDto } from './create-complaint.dto';

const dto = (over: Record<string, unknown> = {}) =>
  plainToInstance(CreateComplaintDto, {
    opdId: 1,
    tingkat: TingkatPengaduan.kabupaten,
    kategori: 'kab_lainnya',
    judul: 'Judul',
    uraian: 'Uraian',
    tanggalKejadian: '2026-11-01',
    lokasiKejadian: 'Jl. Raya Caruban No. 1',
    ...over,
  });

const medanGalat = async (over: Record<string, unknown>) =>
  (await validate(dto(over))).map((e) => e.property);

describe('CreateComplaintDto — kategori per tingkat', () => {
  it.each([
    'kec_administrasi',
    'kec_desa',
    'kec_lainnya',
    'kab_kependudukan',
    'kab_kominfo',
    'kab_lainnya',
  ])('menerima kategori "%s"', async (kategori) => {
    // `@IsIn` di sini hanya memeriksa KEANGGOTAAN, bukan kesepadanan dengan
    // `tingkat`. Kesepadanannya ditegakkan di service (lihat
    // tingkat-pengaduan.util.spec.ts) karena ia membandingkan DUA medan, dan
    // tak ada dekorator class-validator yang dapat menyatakannya.
    expect(await validate(dto({ kategori }))).toHaveLength(0);
  });

  it.each(['aduan', 'lapor', 'lainnya'])(
    'menolak kategori warisan "%s" yang diganti 4 November 2026',
    async (kategori) => {
      // Ketiganya sudah TIDAK ADA di basis data: migrasi
      // 20261104090000_tingkat_pengaduan memetakannya ke "Lainnya" pada
      // tingkatnya masing-masing. Menerimanya di sini berarti membuka kembali
      // jalan bagi baris berkode yang tak dapat diterjemahkan tampilan mana pun.
      expect(await medanGalat({ kategori })).toContain('kategori');
    },
  );

  it.each(['infrastruktur', 'kesehatan', 'pelayanan_administrasi'])(
    'menolak kategori lama "%s" yang sudah dihapus',
    async (kategori) => {
      expect(await medanGalat({ kategori })).toContain('kategori');
    },
  );

  it('tidak lagi mendeklarasikan subKategori — ValidationPipe (forbidNonWhitelisted) akan 400', () => {
    // Bukan sekadar "tak divalidasi": karena app.setup.ts memakai
    // forbidNonWhitelisted, properti yang tak dideklarasikan DITOLAK 400.
    // Itulah sebabnya frontend harus berhenti mengirimnya di rilis yang sama.
    expect(Object.keys(new CreateComplaintDto())).not.toContain('subKategori');
  });
});

describe('CreateComplaintDto — tingkat', () => {
  it.each([TingkatPengaduan.kabupaten, TingkatPengaduan.kecamatan])(
    'menerima tingkat "%s"',
    async (tingkat) => {
      expect(await validate(dto({ tingkat }))).toHaveLength(0);
    },
  );

  it('menolak tingkat yang tidak dikenal', async () => {
    expect(await medanGalat({ tingkat: 'provinsi' })).toContain('tingkat');
  });

  it('WAJIB — tanpa tingkat, pengirim tak diam-diam mendapat kabupaten', async () => {
    // Kolomnya memang `@default(kabupaten)` di Prisma, tetapi DTO sengaja tak
    // ikut berbaku: pengirim yang lupa menyebut tingkat akan ditolak di sini,
    // bukan dua langkah kemudian oleh galat yang menunjuk medan `kategori`.
    expect(await medanGalat({ tingkat: undefined })).toContain('tingkat');
  });
});

describe('CreateComplaintDto — tanggal & lokasi kejadian', () => {
  it('menerima tanggal berformat YYYY-MM-DD', async () => {
    expect(await validate(dto({ tanggalKejadian: '2026-02-28' }))).toHaveLength(0);
  });

  it.each(['01-11-2026', '2026/11/01', '2026-1-1', 'kemarin', ''])(
    'menolak tanggal berbentuk "%s"',
    async (tanggalKejadian) => {
      expect(await medanGalat({ tanggalKejadian })).toContain('tanggalKejadian');
    },
  );

  it('keduanya WAJIB', async () => {
    // Keputusan pengguna 4 November 2026. Kolomnya nullable di basis data
    // HANYA demi 19 pengaduan yang lahir sebelum medan ini ada; setiap
    // pengaduan baru wajib membawanya.
    expect(await medanGalat({ tanggalKejadian: undefined })).toContain('tanggalKejadian');
    expect(await medanGalat({ lokasiKejadian: undefined })).toContain('lokasiKejadian');
    expect(await medanGalat({ lokasiKejadian: '' })).toContain('lokasiKejadian');
  });

  it('menolak lokasi melebihi 255 aksara', async () => {
    // Batasnya sengaja jauh di bawah `uraian` (5000): ini alamat atau nama
    // tempat, bukan kronologi kedua.
    expect(await medanGalat({ lokasiKejadian: 'a'.repeat(256) })).toContain('lokasiKejadian');
    expect(await validate(dto({ lokasiKejadian: 'a'.repeat(255) }))).toHaveLength(0);
  });

  it('TIDAK memeriksa tanggal masa depan — itu tugas parseTanggalKejadian', async () => {
    // Pembagian tugas yang tersurat: regex tak dapat mengetahui hari ini, dan
    // 31 Februari pun berbentuk sah. Keduanya ditolak di service.
    expect(await validate(dto({ tanggalKejadian: '2099-01-01' }))).toHaveLength(0);
    expect(await validate(dto({ tanggalKejadian: '2026-02-31' }))).toHaveLength(0);
  });
});

describe('CreateComplaintDto — flag anonim', () => {
  it('baku: tidak anonim bila field tak dikirim', async () => {
    const instance = dto();

    expect(await validate(instance)).toHaveLength(0);
    expect(instance.isAnonim).toBeUndefined();
  });

  it.each([
    ['true', true],
    [true, true],
    ['false', false],
    [false, false],
  ])('mengubah nilai multipart %p menjadi %p', async (masukan, harapan) => {
    const instance = dto({ isAnonim: masukan });

    expect(await validate(instance)).toHaveLength(0);
    expect(instance.isAnonim).toBe(harapan);
  });
});
