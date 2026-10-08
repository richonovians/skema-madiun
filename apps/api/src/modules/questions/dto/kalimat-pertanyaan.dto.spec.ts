import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateQuestionDto } from './create-question.dto';
import { UpdateQuestionDto } from './update-question.dto';

/**
 * Kalimat pertanyaan yang hanya berisi spasi harus ditolak (8 Oktober 2026).
 * Sejak kalimat pertanyaan unsur dapat disunting OPD, jalan menuju pertanyaan
 * yang tampak kosong bagi responden jauh lebih pendek: cukup menghapus isinya
 * dan menyisakan satu spasi. `@MinLength(1)` saja menerimanya.
 */
describe('DTO kalimat pertanyaan', () => {
  describe('UpdateQuestionDto.teks', () => {
    it('menolak kalimat yang hanya berisi spasi', async () => {
      const dto = plainToInstance(UpdateQuestionDto, { teks: '    ' });

      const galat = await validate(dto);

      expect(galat.map((g) => g.property)).toContain('teks');
    });

    it('memangkas spasi di tepi sebelum disimpan', async () => {
      const dto = plainToInstance(UpdateQuestionDto, { teks: '  Seberapa mudah?  ' });

      expect(await validate(dto)).toHaveLength(0);
      expect(dto.teks).toBe('Seberapa mudah?');
    });

    it('tetap opsional: tanpa teks tidak ada galat', async () => {
      const dto = plainToInstance(UpdateQuestionDto, {});

      expect(await validate(dto)).toHaveLength(0);
      expect(dto.teks).toBeUndefined();
    });

    it('bukan string tetap ditolak (tidak diam-diam dipaksa)', async () => {
      const dto = plainToInstance(UpdateQuestionDto, { teks: 123 });

      const galat = await validate(dto);

      expect(galat.map((g) => g.property)).toContain('teks');
    });
  });

  describe('CreateQuestionDto.teks', () => {
    it('menolak kalimat yang hanya berisi spasi', async () => {
      const dto = plainToInstance(CreateQuestionDto, { teks: '   ', tipe: 'teks' });

      const galat = await validate(dto);

      expect(galat.map((g) => g.property)).toContain('teks');
    });

    it('memangkas spasi di tepi', async () => {
      const dto = plainToInstance(CreateQuestionDto, { teks: ' Saran Anda? ', tipe: 'teks' });

      expect(await validate(dto)).toHaveLength(0);
      expect(dto.teks).toBe('Saran Anda?');
    });
  });

  /**
   * Swagger harus jujur: nilai truthy untuk kodeUnsur/isIkmUnsur kini SELALU
   * ditolak 400 (unsur lahir bersama survei SKM), jadi dokumentasinya tak boleh
   * mengesankan keduanya medan yang sah diisi.
   */
  describe('dokumentasi Swagger CreateQuestionDto', () => {
    const deskripsi = (medan: string): string =>
      (
        Reflect.getMetadata('swagger/apiModelProperties', CreateQuestionDto.prototype, medan) as {
          description?: string;
        }
      ).description ?? '';

    it.each(['kodeUnsur', 'isIkmUnsur'])('%s menyebut bahwa isian truthy ditolak', (medan) => {
      expect(deskripsi(medan)).toMatch(/ditolak/i);
    });
  });
});
