import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateComplaintDto } from './create-complaint.dto';

const dto = (over: Record<string, unknown> = {}) =>
  plainToInstance(CreateComplaintDto, {
    opdId: 1,
    kategori: 'aduan',
    judul: 'Judul',
    uraian: 'Uraian',
    ...over,
  });

describe('CreateComplaintDto — kategori umum', () => {
  it.each(['aduan', 'lapor', 'lainnya'])('menerima kategori "%s"', async (kategori) => {
    expect(await validate(dto({ kategori }))).toHaveLength(0);
  });

  it.each(['infrastruktur', 'kesehatan', 'pelayanan_administrasi'])(
    'menolak kategori lama "%s" yang sudah dihapus',
    async (kategori) => {
      const errors = await validate(dto({ kategori }));

      expect(errors.map((e) => e.property)).toContain('kategori');
    },
  );

  it('tidak lagi mendeklarasikan subKategori — ValidationPipe (forbidNonWhitelisted) akan 400', () => {
    // Bukan sekadar "tak divalidasi": karena app.setup.ts memakai
    // forbidNonWhitelisted, properti yang tak dideklarasikan DITOLAK 400.
    // Itulah sebabnya frontend harus berhenti mengirimnya di rilis yang sama.
    expect(Object.keys(new CreateComplaintDto())).not.toContain('subKategori');
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
