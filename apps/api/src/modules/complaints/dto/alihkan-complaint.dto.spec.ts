import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AlihkanComplaintDto } from './alihkan-complaint.dto';

const dto = (over: Record<string, unknown> = {}) =>
  plainToInstance(AlihkanComplaintDto, {
    opdId: 5,
    kategori: 'kab_lainnya',
    catatan: 'Bukan kewenangan kami, berkaitan dengan infrastruktur jalan.',
    ...over,
  });

const medanGalat = async (over: Record<string, unknown> = {}) =>
  (await validate(dto(over))).map((e) => e.property);

describe('AlihkanComplaintDto', () => {
  it('menerima badan yang sah', async () => {
    expect(await medanGalat()).toHaveLength(0);
  });

  it('menolak kategori yang tak dikenal', async () => {
    expect(await medanGalat({ kategori: 'kab_entah' })).toContain('kategori');
  });

  it('menerima kategori dari KEDUA tingkat', async () => {
    // DTO belum tahu tingkat tujuannya -- ia baru diturunkan dari nama OPD di
    // service. Yang diperiksa di sini hanya keanggotaan; kesepadanan tingkat
    // ditegakkan `assertKategoriSesuaiTingkat`.
    expect(await medanGalat({ kategori: 'kec_lainnya' })).toHaveLength(0);
  });

  it('menolak catatan kosong', async () => {
    expect(await medanGalat({ catatan: '' })).toContain('catatan');
  });

  it('menolak catatan berisi spasi saja', async () => {
    // `@IsNotEmpty()` sendirian MELOLOSKAN '   ', dan baris riwayat yang
    // lahir darinya tak menjelaskan apa pun kepada pelapor -- padahal itulah
    // satu-satunya alasan catatan diwajibkan.
    expect(await medanGalat({ catatan: '   ' })).toContain('catatan');
  });

  it('memangkas spasi di tepi catatan', async () => {
    expect(dto({ catatan: '  Salah tujuan.  ' }).catatan).toBe('Salah tujuan.');
  });

  it('menolak opdId 0', async () => {
    expect(await medanGalat({ opdId: 0 })).toContain('opdId');
  });

  it('menolak badan tanpa opdId', async () => {
    const tanpaOpd = plainToInstance(AlihkanComplaintDto, {
      kategori: 'kab_lainnya',
      catatan: 'Salah tujuan.',
    });
    expect((await validate(tanpaOpd)).map((e) => e.property)).toContain('opdId');
  });
});
