import { BadRequestException } from '@nestjs/common';
import { JenisSurvei, MetodeNilai, TujuanSurvei } from '@prisma/client';
import { assertPengaturanNilaiBuat, assertPengaturanNilaiUbah } from './pengaturan-nilai.util';

const { skm_permenpanrb: skm, custom } = JenisSurvei;
const { kepuasan } = TujuanSurvei;
const { rata_rata } = MetodeNilai;

describe('assertPengaturanNilaiBuat', () => {
  it('survei custom wajib memilih tujuan DAN metode', () => {
    expect(() => assertPengaturanNilaiBuat(custom, undefined, undefined)).toThrow(
      BadRequestException,
    );
    expect(() => assertPengaturanNilaiBuat(custom, kepuasan, undefined)).toThrow(
      'Tujuan dan metode nilai wajib dipilih untuk survei custom',
    );
    expect(() => assertPengaturanNilaiBuat(custom, undefined, rata_rata)).toThrow(
      'Tujuan dan metode nilai wajib dipilih untuk survei custom',
    );
  });

  it('survei custom yang memilih keduanya lolos', () => {
    expect(() => assertPengaturanNilaiBuat(custom, kepuasan, rata_rata)).not.toThrow();
  });

  it('survei SKM menolak tujuan maupun metode', () => {
    expect(() => assertPengaturanNilaiBuat(skm, kepuasan, undefined)).toThrow(
      'Survei SKM tidak memakai tujuan dan metode nilai',
    );
    expect(() => assertPengaturanNilaiBuat(skm, undefined, rata_rata)).toThrow(BadRequestException);
    expect(() => assertPengaturanNilaiBuat(skm, kepuasan, rata_rata)).toThrow(BadRequestException);
  });

  it('survei SKM tanpa keduanya lolos', () => {
    expect(() => assertPengaturanNilaiBuat(skm, undefined, undefined)).not.toThrow();
  });
});

describe('assertPengaturanNilaiUbah', () => {
  it('survei SKM menolak salah satunya', () => {
    expect(() => assertPengaturanNilaiUbah(skm, kepuasan, undefined)).toThrow(
      'Survei SKM tidak memakai tujuan dan metode nilai',
    );
    expect(() => assertPengaturanNilaiUbah(skm, undefined, rata_rata)).toThrow(BadRequestException);
  });

  it('survei SKM tanpa keduanya lolos (ubah judul saja)', () => {
    expect(() => assertPengaturanNilaiUbah(skm, undefined, undefined)).not.toThrow();
  });

  it('survei custom boleh mengubah salah satu, keduanya, atau tidak sama sekali', () => {
    expect(() => assertPengaturanNilaiUbah(custom, kepuasan, undefined)).not.toThrow();
    expect(() => assertPengaturanNilaiUbah(custom, undefined, rata_rata)).not.toThrow();
    expect(() => assertPengaturanNilaiUbah(custom, kepuasan, rata_rata)).not.toThrow();
    expect(() => assertPengaturanNilaiUbah(custom, undefined, undefined)).not.toThrow();
  });
});
