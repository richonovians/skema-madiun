import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * Satu opsi jawaban. Tipe `pilihan`: pilihan yang dipilih responden (`nilai`
 * opsional, di luar rumus IKM). Tipe `skala`: label untuk satu skor, dengan
 * `nilai` = skor 1-4 (2026-08-20 -- label skala kini dapat disesuaikan).
 */
export class QuestionOptionEntity extends BaseEntity<QuestionOptionEntity> {
  id: number;
  label: string;
  nilai: number | null;
  urutan: number;
}
