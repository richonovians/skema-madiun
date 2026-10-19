import { BadRequestException } from '@nestjs/common';
import { JenisSurvei, Question, QuestionType, Survey } from '@prisma/client';
import { SKM_UNSUR } from '../reference/reference.constants';

/**
 * Aturan kerangka 9 unsur survei SKM PermenPANRB 14/2017 (8 Oktober 2026).
 *
 * Yang dapat diubah OPD adalah KALIMAT pertanyaan tiap unsur; yang tidak dapat
 * diubah adalah standar ukurnya: kesembilan unsur harus ada, tepat satu
 * pertanyaan per unsur. Alasannya ada di rumus: `IkmService.computeResult`
 * membagi bobot dengan jumlah pertanyaan unsur, jadi menghapus satu unsur
 * diam-diam menggeser bobot delapan unsur lain.
 *
 * Fungsi-fungsi di sini murni (tanpa basis data) dan dipakai bersama
 * `QuestionsService` dan `SurveysService`, supaya kedua modul tak pernah
 * berbeda pendapat tentang apa yang boleh.
 */

type JenisSurveiTerbaca = Pick<Survey, 'jenis'>;
type PenandaUnsur = Pick<Question, 'isIkmUnsur' | 'kodeUnsur'>;

const adalahSkm = (survey: JenisSurveiTerbaca): boolean =>
  survey.jenis === JenisSurvei.skm_permenpanrb;

/** Unsur survei SKM tidak boleh dihapus, satu pun. */
export function assertBolehHapusPertanyaan(
  survey: JenisSurveiTerbaca,
  question: PenandaUnsur,
): void {
  if (adalahSkm(survey) && question.isIkmUnsur) {
    throw new BadRequestException(
      'Unsur baku PermenPANRB tidak dapat dihapus dari survei SKM. Anda hanya dapat mengubah kalimat pertanyaannya.',
    );
  }
}

/**
 * Unsur lahir bersama survei SKM. Pertanyaan baru tidak boleh membawa penanda
 * unsur, di jenis survei mana pun: pada SKM akan menggandakan unsur, pada
 * survei custom akan memunculkan IKM dari survei yang tak berkerangka.
 */
export function assertBolehBuatPertanyaan(
  survey: JenisSurveiTerbaca,
  dto: { kodeUnsur?: string; isIkmUnsur?: boolean },
): void {
  if (!dto.kodeUnsur && dto.isIkmUnsur !== true) {
    return;
  }
  throw new BadRequestException(
    adalahSkm(survey)
      ? 'Unsur baku sudah tersedia di survei SKM dan tidak dapat ditambah. Tambahkan sebagai pertanyaan biasa.'
      : 'Survei custom tidak memiliki unsur baku, sehingga pertanyaannya tidak dapat ditandai sebagai unsur IKM.',
  );
}

/**
 * Penanda unsur tidak boleh berubah. Kiriman yang SAMA dengan nilai tersimpan
 * tidak dihitung perubahan: formulir mengirim seluruh medan, dan menolaknya
 * membuat penyuntingan kalimat ikut gagal.
 */
export function assertBolehUbahPenandaUnsur(
  survey: JenisSurveiTerbaca,
  question: PenandaUnsur,
  dto: { kodeUnsur?: string; isIkmUnsur?: boolean },
): void {
  const kodeBerubah = dto.kodeUnsur !== undefined && dto.kodeUnsur !== (question.kodeUnsur ?? '');
  const tandaBerubah = dto.isIkmUnsur !== undefined && dto.isIkmUnsur !== question.isIkmUnsur;

  if (adalahSkm(survey)) {
    if (kodeBerubah || tandaBerubah) {
      throw new BadRequestException(
        'Kode dan penanda unsur pada survei SKM tidak dapat diubah. Anda hanya dapat mengubah kalimat pertanyaannya.',
      );
    }
    return;
  }

  // Survei custom: yang ditolak hanya MENJADIKAN pertanyaan sebagai unsur.
  if ((kodeBerubah && dto.kodeUnsur) || (tandaBerubah && dto.isIkmUnsur === true)) {
    throw new BadRequestException(
      'Survei custom tidak memiliki unsur baku, sehingga pertanyaannya tidak dapat ditandai sebagai unsur IKM.',
    );
  }
}

/** Kode U1-U9 yang belum ada pada `kodeAda`, berurutan. Kode asing dan `null` diabaikan. */
export function unsurHilang(kodeAda: readonly (string | null)[]): string[] {
  const ada = new Set(kodeAda);
  return SKM_UNSUR.map((unsur) => unsur.kode).filter((kode) => !ada.has(kode));
}

/**
 * Survei SKM hanya boleh diaktifkan bila kesembilan unsurnya lengkap. Keadaan
 * tak lengkap hanya mungkin pada data lama (mis. penghapusan massal yang
 * terhenti di tengah); jalan keluarnya `SurveysService.duplicate`, yang
 * melengkapi unsur yang hilang pada salinannya.
 */
export function assertKerangkaLengkap(
  survey: JenisSurveiTerbaca,
  kodeAda: readonly (string | null)[],
): void {
  if (!adalahSkm(survey)) {
    return;
  }
  const hilang = unsurHilang(kodeAda);
  if (hilang.length > 0) {
    throw new BadRequestException(
      `Survei SKM harus memuat kesembilan unsur baku. Unsur yang belum ada: ${hilang.join(', ')}. Gandakan survei ini untuk mendapatkan salinan dengan kerangka lengkap.`,
    );
  }
}

/** Sembilan pertanyaan unsur yang dibuat bersama survei SKM (kalimat awal = nama unsur). */
export function buatUnsurAwal(): {
  teks: string;
  tipe: QuestionType;
  isIkmUnsur: true;
  kodeUnsur: string;
  urutan: number;
}[] {
  return SKM_UNSUR.map((unsur, index) => ({
    teks: unsur.teks,
    tipe: QuestionType.skala,
    isIkmUnsur: true as const,
    kodeUnsur: unsur.kode,
    urutan: index + 1,
  }));
}
