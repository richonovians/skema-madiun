import { JenisKelamin } from '@prisma/client';
import { BaseEntity } from '../../../common/entities/base.entity';
import { AnswerEntity } from './answer.entity';

/**
 * Respons pengisian survei.
 *
 * TETAP TIDAK memuat `userId`/`dedupeUserId`. Yang dibuka 1 Oktober 2026 adalah
 * data diri yang pengisinya SETUJU berikan, bukan tautan ke akunnya: id pengguna
 * menghubungkan respons ini dengan setiap respons lain milik orang yang sama,
 * sedangkan empat kolom di bawah berhenti pada respons ini saja.
 *
 * SEBELUMNYA entity ini menutup data diri itu juga, dengan alasan "SKM bersifat
 * agregat/anonim -- identitas pengisi tidak diekspos ke admin OPD". Alasan itu
 * ditulis sebelum pengguna meminta nama direkam (8 September 2026) dan sebelum
 * gerbang pengisian memperoleh kotak centang anonim yang hidup. Sejak pengisi
 * dapat MEMILIH, menutup pilihan mereka yang memilih memberi datanya bukan lagi
 * perlindungan, melainkan membuang persetujuan yang sudah diberikan -- dan
 * catatan di schema.prisma menyebut akibatnya tersurat: keempat kolom itu
 * menjadi "data pribadi yang tersimpan tanpa pemakai", kewajiban PDP tanpa
 * manfaat.
 *
 * NULL ADALAH JAWABAN YANG SAH dan wajib diteruskan apa adanya. Keempatnya null
 * berarti pengisi memilih tanpa data diri; menggantinya dengan string kosong
 * atau '-' di lapisan ini membuat "memilih anonim" tak dapat dibedakan dari
 * "datanya hilang".
 */
export class ResponseEntity extends BaseEntity<ResponseEntity> {
  id: number;
  surveyId: number;
  submittedAt: Date;

  /** Dari akun pengirim (jalur bersesi) atau diketik (jalur publik). */
  nama: string | null;

  /**
   * SELALU diketik pengisi, pada kedua jalur. Helpdesk tak mengirim nomor
   * telepon, jadi tak ada jalur mana pun yang dapat menyalinnya dari akun.
   */
  nomorHp: string | null;

  jenisKelamin: JenisKelamin | null;
  kelompokUmur: string | null;

  answers?: AnswerEntity[];
}
