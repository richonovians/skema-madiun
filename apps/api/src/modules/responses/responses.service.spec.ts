import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { enkripsiKolom } from '../../common/crypto/kolom';
import { JenisKelamin, QuestionType, Role, SurveyStatus } from '@prisma/client';
import type { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import type { ConsentService } from '../auth/consent.service';
import type { NotificationsService } from '../notifications/notifications.service';
import type { PenyimpanSinggahan } from '../../common/cache/penyimpan-singgahan.interface';
import { ResponsesService } from './responses.service';

const responden = (userId = 10): CurrentUser => ({
  userId,
  roles: [Role.responden],
  actingRole: Role.responden,
  opdId: null,
});

const skalaQ = (id: number) => ({ id, surveyId: 1, tipe: QuestionType.skala, options: [] });
const teksQ = (id: number) => ({ id, surveyId: 1, tipe: QuestionType.teks, options: [] });
const pilihanQ = (id: number, optionIds: number[]) => ({
  id,
  surveyId: 1,
  tipe: QuestionType.pilihan,
  options: optionIds.map((oid, i) => ({
    id: oid,
    questionId: id,
    label: `Opsi ${i + 1}`,
    nilai: null,
    urutan: i + 1,
  })),
});

const aktifSurvey = (over: Record<string, unknown> = {}) => ({
  id: 1,
  opdId: 5,
  status: SurveyStatus.aktif,
  allowMultipleSubmit: false,
  questions: [skalaQ(101), teksQ(102)],
  ...over,
});

describe('ResponsesService', () => {
  const prisma = {
    survey: { findUnique: jest.fn(), findFirst: jest.fn() },
    // Dibaca `submit` untuk menyalin data diri akun ke respons (8 September
    // 2026). Bakunya diisi di `beforeEach` supaya seluruh uji `submit` yang
    // sudah ada tidak perlu menyebut akun yang bukan urusan mereka.
    user: { findUnique: jest.fn() },
    surveyResponse: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  } as unknown as PrismaService;
  const consent = {
    assertConsented: jest.fn().mockResolvedValue(undefined),
  } as unknown as ConsentService;
  const notifications = {
    notifySurveyResponse: jest.fn().mockResolvedValue(undefined),
  } as unknown as NotificationsService;
  /**
   * Kunci uji tetap untuk kolom terenkripsi. `users.nomorHp` disimpan sebagai
   * amplop (lihat common/crypto/kolom.ts), jadi layanan ini harus
   * mendekripsinya sebelum menyalinnya ke respons.
   */
  const KUNCI_UJI_KOLOM = Buffer.alloc(32, 0xc);
  const config = {
    get: jest.fn((kunci: string) =>
      kunci === 'crypto.dataKey' ? KUNCI_UJI_KOLOM.toString('hex') : undefined,
    ),
  } as unknown as ConfigService;
  /**
   * Pembatal singgahan hitungan IKM. Lihat describe terakhir berkas ini untuk
   * alasan keberadaannya.
   */
  const singgahan = {
    ambil: jest.fn().mockResolvedValue(null),
    simpan: jest.fn().mockResolvedValue(undefined),
    hapus: jest.fn().mockResolvedValue(undefined),
  } as unknown as PenyimpanSinggahan;
  const service = new ResponsesService(prisma, consent, notifications, config, singgahan);

  const AKUN_BERPROFIL = {
    nama: 'Siti Aminah',
    // Kedua kolom ini lahir 1 Oktober 2026 dan ikut di-`select` sejak nomor HP
    // serta jenis kelamin disalin dari akun Helpdesk. Ditulis TERSURAT sebagai
    // null supaya fixture ini mewakili akun yang BELUM pernah login ulang --
    // keadaan seluruh akun yang sudah ada saat kolomnya dibuat.
    nomorHp: null,
    jenisKelamin: null,
    respondentProfile: { jenisKelamin: JenisKelamin.perempuan, kelompokUmur: '26-35' },
  };

  beforeEach(() => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(AKUN_BERPROFIL);
  });

  /**
   * Penegakan persetujuan PDP (celah 2, 2026-08-27). Penjaga navigasi di
   * frontend saja tak cukup — cookie `consent` dapat disunting pemiliknya,
   * jadi titik pengumpulan datanya sendiri yang harus menolak.
   */
  describe('penegakan persetujuan PDP', () => {
    it('menolak SEBELUM survei dibaca, bukan setelah jawaban tervalidasi', async () => {
      (consent.assertConsented as jest.Mock).mockRejectedValueOnce(
        new ForbiddenException('Anda perlu memberikan persetujuan'),
      );

      await expect(
        service.submit(1, { answers: [{ questionId: 101, nilai: 4 }] }, responden()),
      ).rejects.toThrow(ForbiddenException);

      // Menolak lebih awal berarti tak ada kueri yang terbuang, dan pesan
      // galatnya soal persetujuan — bukan soal survei tak ditemukan.
      expect(prisma.survey.findUnique).not.toHaveBeenCalled();
    });

    it('sudah menyetujui -> submit berjalan seperti biasa', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(aktifSurvey());
      (prisma.surveyResponse.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.surveyResponse.create as jest.Mock).mockResolvedValue({
        id: 1,
        surveyId: 1,
        submittedAt: new Date(),
        answers: [],
      });

      await service.submit(
        1,
        {
          answers: [
            { questionId: 101, nilai: 4 },
            { questionId: 102, teks: 'ok' },
          ],
        },
        responden(),
      );

      expect(consent.assertConsented).toHaveBeenCalledWith(responden());
    });
  });

  beforeEach(() => jest.clearAllMocks());

  describe('getFill', () => {
    it('survei non-aktif → NotFound', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue({
        ...aktifSurvey(),
        status: SurveyStatus.draft,
      });
      await expect(service.getFill(1, responden())).rejects.toThrow(NotFoundException);
    });

    it('survei aktif → kembalikan fill + flag sudahMengisi', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(aktifSurvey());
      (prisma.surveyResponse.findFirst as jest.Mock).mockResolvedValue({ id: 99 });

      const fill = await service.getFill(1, responden());

      expect(fill.questions).toHaveLength(2);
      expect(fill.sudahMengisi).toBe(true);
    });
  });

  describe('submit', () => {
    it('survei tidak aktif → NotFound', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(
        service.submit(1, { answers: [{ questionId: 101, nilai: 4 }] }, responden()),
      ).rejects.toThrow(NotFoundException);
    });

    it('jawaban untuk pertanyaan di luar survei → BadRequest', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(aktifSurvey());
      await expect(
        service.submit(1, { answers: [{ questionId: 999, nilai: 4 }] }, responden()),
      ).rejects.toThrow(BadRequestException);
    });

    it('pertanyaan skala wajib tidak dijawab → BadRequest', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(aktifSurvey());
      // hanya menjawab pertanyaan teks (102), skala (101) terlewat
      await expect(
        service.submit(1, { answers: [{ questionId: 102, teks: 'saran' }] }, responden()),
      ).rejects.toThrow(BadRequestException);
    });

    it('single-submit yang sudah mengisi → Conflict (409)', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(aktifSurvey());
      (prisma.surveyResponse.findFirst as jest.Mock).mockResolvedValue({ id: 77 });
      await expect(
        service.submit(1, { answers: [{ questionId: 101, nilai: 4 }] }, responden()),
      ).rejects.toThrow(ConflictException);
    });

    it('happy path → buat respons dengan dedupeUserId terisi', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(aktifSurvey());
      (prisma.surveyResponse.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.surveyResponse.create as jest.Mock).mockResolvedValue({
        id: 1,
        surveyId: 1,
        submittedAt: new Date(),
        answers: [
          { id: 1, questionId: 101, nilai: 4, teks: null, selectedOptionId: null },
          { id: 2, questionId: 102, nilai: null, teks: 'bagus', selectedOptionId: null },
        ],
      });

      const res = await service.submit(
        1,
        {
          answers: [
            { questionId: 101, nilai: 4 },
            { questionId: 102, teks: 'bagus' },
          ],
        },
        responden(10),
      );

      expect(res.answers).toHaveLength(2);
      expect(prisma.surveyResponse.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ dedupeUserId: 10 }) }),
      );
    });

    it('multi-submit → dedupeUserId null (boleh berulang)', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(
        aktifSurvey({ allowMultipleSubmit: true }),
      );
      (prisma.surveyResponse.create as jest.Mock).mockResolvedValue({
        id: 2,
        surveyId: 1,
        submittedAt: new Date(),
        answers: [{ id: 3, questionId: 101, nilai: 3, teks: null, selectedOptionId: null }],
      });

      await service.submit(1, { answers: [{ questionId: 101, nilai: 3 }] }, responden());

      expect(prisma.surveyResponse.findFirst).not.toHaveBeenCalled(); // tak perlu pra-cek
      expect(prisma.surveyResponse.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ dedupeUserId: null }) }),
      );
    });

    describe('tipe pilihan', () => {
      const surveyWithPilihan = () =>
        aktifSurvey({ questions: [skalaQ(101), pilihanQ(201, [301, 302])] });

      it('pilihan wajib memilih opsi → BadRequest bila kosong', async () => {
        (prisma.survey.findFirst as jest.Mock).mockResolvedValue(surveyWithPilihan());
        await expect(
          service.submit(1, { answers: [{ questionId: 101, nilai: 4 }] }, responden()),
        ).rejects.toThrow(BadRequestException);
      });

      it('selectedOptionId bukan milik pertanyaan tsb → BadRequest', async () => {
        (prisma.survey.findFirst as jest.Mock).mockResolvedValue(surveyWithPilihan());
        await expect(
          service.submit(
            1,
            {
              answers: [
                { questionId: 101, nilai: 4 },
                { questionId: 201, selectedOptionId: 999 },
              ],
            },
            responden(),
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it('sukses → Answer dibuat dengan selectedOption terhubung', async () => {
        (prisma.survey.findFirst as jest.Mock).mockResolvedValue(surveyWithPilihan());
        (prisma.surveyResponse.findFirst as jest.Mock).mockResolvedValue(null);
        (prisma.surveyResponse.create as jest.Mock).mockResolvedValue({
          id: 1,
          surveyId: 1,
          submittedAt: new Date(),
          answers: [
            { id: 1, questionId: 101, nilai: 4, teks: null, selectedOptionId: null },
            { id: 2, questionId: 201, nilai: null, teks: null, selectedOptionId: 302 },
          ],
        });

        const res = await service.submit(
          1,
          {
            answers: [
              { questionId: 101, nilai: 4 },
              { questionId: 201, selectedOptionId: 302 },
            ],
          },
          responden(10),
        );

        expect(res.answers?.[1].selectedOptionId).toBe(302);
        expect(prisma.surveyResponse.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              answers: {
                create: [
                  { question: { connect: { id: 101 } }, nilai: 4 },
                  {
                    question: { connect: { id: 201 } },
                    selectedOption: { connect: { id: 302 } },
                  },
                ],
              },
            }),
          }),
        );
      });
    });
  });

  describe('findAllForSurvey', () => {
    it('Admin OPD lain → Forbidden', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue({ id: 1, opdId: 5 });
      await expect(
        service.findAllForSurvey(
          1,
          { page: 1, limit: 20 },
          {
            userId: 1,
            roles: [Role.opd],
            actingRole: Role.opd,
            opdId: 999,
          },
        ),
      ).rejects.toThrow(/akses/i);
    });

    /**
     * Laporan pengguna 13 September 2026: "nomornya terbalik dengan nomor soal
     * di survei".
     *
     * `include: { answers: true }` tanpa `orderBy` membuat urutannya tak
     * ditentukan, dan layar detail menomori jawaban dari POSISI ARRAY. Pada
     * basis data lokal, dua dari tiga respons kembali dalam urutan soal
     * [9,8,7,6,5,4,3,2,1] -- persis terbalik; yang ketiga kebetulan benar,
     * itulah sebabnya gejalanya tak selalu muncul.
     */
    it('jawaban diminta terurut mengikuti urutan pertanyaan survei', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue({ id: 1, opdId: 5 });
      (prisma.$transaction as jest.Mock).mockResolvedValue([[], 0]);

      await service.findAllForSurvey(
        1,
        { page: 1, limit: 20 },
        { userId: 1, roles: [Role.kabupaten], actingRole: Role.kabupaten, opdId: null },
      );

      expect(prisma.surveyResponse.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: { answers: { orderBy: { question: { urutan: 'asc' } } } },
        }),
      );
    });

    /**
     * DATA DIRI PENGISI DIBUKA KEPADA ADMIN (1 Oktober 2026, keputusan tersurat
     * pengguna sesudah laporan "data responden bukan anonim belum tampil").
     *
     * Keempat kolomnya sudah tersimpan sejak 8 September 2026, tetapi
     * `ResponseEntity` hanya memuat id/surveyId/submittedAt -- catatan di
     * schema.prisma menyebutnya tersurat: "BELUM ADA PEMBACANYA... keempatnya
     * data pribadi yang tersimpan tanpa pemakai". Laporan itulah pembacanya.
     *
     * Barisnya TIDAK perlu kueri tambahan: `findAllForSurvey` sudah memakai
     * `include`, jadi seluruh kolom baris itu memang sudah terambil dan selama
     * ini dibuang oleh pemetanya.
     */
    it('mengembalikan data diri pengisi yang tersimpan', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue({ id: 1, opdId: 5 });
      (prisma.$transaction as jest.Mock).mockResolvedValue([
        [
          {
            id: 9,
            surveyId: 1,
            submittedAt: new Date('2026-10-01T00:00:00.000Z'),
            nama: 'Siti Aminah',
            nomorHp: '081234567890',
            jenisKelamin: JenisKelamin.perempuan,
            kelompokUmur: '26-35',
            answers: [],
          },
        ],
        1,
      ]);

      const hasil = await service.findAllForSurvey(
        1,
        { page: 1, limit: 20 },
        { userId: 1, roles: [Role.kabupaten], actingRole: Role.kabupaten, opdId: null },
      );

      expect(hasil.items[0]).toEqual(
        expect.objectContaining({
          nama: 'Siti Aminah',
          nomorHp: '081234567890',
          jenisKelamin: JenisKelamin.perempuan,
          kelompokUmur: '26-35',
        }),
      );
    });

    it('KONTROL: respons anonim tetap null pada keempat kolomnya', async () => {
      // Pagar yang menentukan sah-tidaknya seluruh perubahan ini. Pengisi yang
      // memilih anonim menyimpan null pada keempat kolom, dan pemetanya tak
      // boleh menggantinya dengan string kosong, '-' , atau apa pun yang
      // terbaca sebagai data. Tanpa uji ini, membuka kolomnya dan membocorkan
      // identitas orang yang memilih tidak memberikannya terlihat sama saja.
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue({ id: 1, opdId: 5 });
      (prisma.$transaction as jest.Mock).mockResolvedValue([
        [
          {
            id: 10,
            surveyId: 1,
            submittedAt: new Date('2026-10-01T00:00:00.000Z'),
            nama: null,
            nomorHp: null,
            jenisKelamin: null,
            kelompokUmur: null,
            answers: [],
          },
        ],
        1,
      ]);

      const hasil = await service.findAllForSurvey(
        1,
        { page: 1, limit: 20 },
        { userId: 1, roles: [Role.kabupaten], actingRole: Role.kabupaten, opdId: null },
      );

      expect(hasil.items[0]).toEqual(
        expect.objectContaining({
          nama: null,
          nomorHp: null,
          jenisKelamin: null,
          kelompokUmur: null,
        }),
      );
    });

    /**
     * NOMOR RESPONS ADALAH URUTAN MASUK, BUKAN POSISI DI LAYAR (4 Oktober 2026,
     * laporan pengguna: "urutan respon survei terbalik, respon paling pertama
     * masuk akan tertimbun").
     *
     * Sebelumnya layar menomori dari POSISI ARRAY (`index + 1`) atas daftar yang
     * diurutkan terbaru-dahulu. Akibatnya nomor itu bukan identitas: respons
     * yang kemarin "#1" menjadi "#2" begitu ada pengisi baru, dan respons yang
     * benar-benar pertama justru memperoleh angka terbesar. Nomor yang berubah
     * sendiri tak dapat dipakai merujuk apa pun -- admin yang mencatat "lihat
     * respons #3" menunjuk respons yang berbeda keesokan harinya.
     *
     * Frontend TIDAK DAPAT menghitungnya sendiri: ia hanya memegang satu
     * halaman dan tak tahu ada berapa respons sebelum baris pertamanya. Karena
     * itu nomornya dihitung di sini, dari `total` yang memang sudah diambil
     * transaksi yang sama.
     *
     * URUTANNYA MENAIK sejak 4 Oktober 2026 (permintaan kedua pengguna pada
     * hari yang sama: "respon #1 di posisi paling atas dan seterusnya").
     * Keputusan sebelumnya -- terbaru-dahulu, nomor dihitung mundur dari
     * `total` -- dibalik pada hari ia ditulis, dan itu ikut dicatat di sini
     * supaya pembaca berikutnya tak menyangka salah satunya kekeliruan.
     *
     * Menaik juga membuat nomornya lebih murah: `offset + index + 1` tak
     * bergantung pada `total` sama sekali, jadi respons yang masuk di tengah
     * paginasi tak dapat menggeser nomor siapa pun.
     */
    it('menomori respons menurut urutan masuk, dari yang paling lama', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue({ id: 1, opdId: 5 });
      // 3 respons, terlama dahulu. Nomornya 1, 2, 3.
      (prisma.$transaction as jest.Mock).mockResolvedValue([
        [
          { id: 10, surveyId: 1, submittedAt: new Date('2026-10-01T00:00:00.000Z'), answers: [] },
          { id: 20, surveyId: 1, submittedAt: new Date('2026-10-02T00:00:00.000Z'), answers: [] },
          { id: 30, surveyId: 1, submittedAt: new Date('2026-10-03T00:00:00.000Z'), answers: [] },
        ],
        3,
      ]);

      const hasil = await service.findAllForSurvey(
        1,
        { page: 1, limit: 20 },
        { userId: 1, roles: [Role.kabupaten], actingRole: Role.kabupaten, opdId: null },
      );

      expect(hasil.items.map((r) => r.nomor)).toEqual([1, 2, 3]);
      // Yang paling lama masuk berada di BARIS PERTAMA dan bernomor 1.
      expect(hasil.items[0]).toEqual(expect.objectContaining({ id: 10, nomor: 1 }));
    });

    it('nomor pada halaman kedua melanjutkan, tidak mengulang dari 1', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue({ id: 1, opdId: 5 });
      // total 25, limit 20, halaman 2 berisi 5 respons terbaru → nomor 21..25.
      (prisma.$transaction as jest.Mock).mockResolvedValue([
        [21, 22, 23, 24, 25].map((n) => ({
          id: n,
          surveyId: 1,
          submittedAt: new Date('2026-10-01T00:00:00.000Z'),
          answers: [],
        })),
        25,
      ]);

      const hasil = await service.findAllForSurvey(
        1,
        { page: 2, limit: 20 },
        { userId: 1, roles: [Role.kabupaten], actingRole: Role.kabupaten, opdId: null },
      );

      expect(hasil.items.map((r) => r.nomor)).toEqual([21, 22, 23, 24, 25]);
    });

    /**
     * `submittedAt` KEMBAR BUKAN PERKARA TEORETIS: dua pengisi dapat mengirim
     * dalam milidetik yang sama, dan Postgres tak menjanjikan urutan apa pun
     * bagi baris yang kunci urutnya seri. Tanpa pemecah seri, kedua respons itu
     * dapat bertukar tempat antar-permintaan, dan karena nomornya diturunkan
     * dari posisi, nomor keduanya ikut bertukar. `id` menaik monoton, jadi ia
     * pemecah seri yang stabil.
     */
    it('urutannya punya pemecah seri id supaya nomornya tidak goyah', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue({ id: 1, opdId: 5 });
      (prisma.$transaction as jest.Mock).mockResolvedValue([[], 0]);

      await service.findAllForSurvey(
        1,
        { page: 1, limit: 20 },
        { userId: 1, roles: [Role.kabupaten], actingRole: Role.kabupaten, opdId: null },
      );

      expect(prisma.surveyResponse.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ submittedAt: 'asc' }, { id: 'asc' }],
        }),
      );
    });

    it('survei tidak ada → NotFound', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(
        service.findAllForSurvey(
          1,
          { page: 1, limit: 20 },
          {
            userId: 1,
            roles: [Role.kabupaten],
            actingRole: Role.kabupaten,
            opdId: null,
          },
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
  /**
   * Jalur publik (spec bagian 5): pengisian TANPA sesi. Setiap kasus di bawah
   * dipasangkan dengan kontrolnya -- gerbang yang tak pernah terbukti terbuka
   * tak membuktikan bahwa penolakannya berarti.
   */
  describe('jalur publik (tanpa sesi)', () => {
    const surveiAnonim = (over: Record<string, unknown> = {}) =>
      aktifSurvey({ izinkanAnonim: true, judul: 'SKM Loket', periode: '2026-Q3', ...over });

    it('getPublicFill menolak survei yang tidak mengizinkan anonim -> NotFound', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(
        surveiAnonim({ izinkanAnonim: false }),
      );

      await expect(service.getPublicFill(1)).rejects.toThrow(NotFoundException);
    });

    it('getPublicFill menolak survei non-aktif -> NotFound', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(
        surveiAnonim({ status: SurveyStatus.draft }),
      );

      await expect(service.getPublicFill(1)).rejects.toThrow(NotFoundException);
    });

    it('getPublicFill pada survei anonim aktif -> kuesioner, sudahMengisi selalu false', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(surveiAnonim());

      const hasil = await service.getPublicFill(1);

      expect(hasil.id).toBe(1);
      expect(hasil.questions).toHaveLength(2);
      // Tanpa sesi tak ada pegangan anti-duplikat -- penandanya di peramban.
      expect(hasil.sudahMengisi).toBe(false);
      expect(prisma.surveyResponse.findFirst).not.toHaveBeenCalled();
    });

    it('submitPublic menolak survei yang tidak mengizinkan anonim -> NotFound', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(
        surveiAnonim({ izinkanAnonim: false }),
      );

      await expect(
        service.submitPublic(1, { answers: [{ questionId: 101, nilai: 4 }], setuju: true }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.surveyResponse.create).not.toHaveBeenCalled();
    });

    it('submitPublic menulis userId & dedupeUserId null', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(surveiAnonim());
      (prisma.surveyResponse.create as jest.Mock).mockResolvedValue({
        id: 9,
        surveyId: 1,
        submittedAt: new Date(),
        answers: [],
      });

      const hasil = await service.submitPublic(1, {
        answers: [{ questionId: 101, nilai: 4 }],
        setuju: true,
      });

      expect(hasil.id).toBe(9);
      expect(prisma.surveyResponse.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: null, dedupeUserId: null }),
        }),
      );
    });

    it('submitPublic tetap memvalidasi kelengkapan jawaban', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(surveiAnonim());

      // Pertanyaan skala (101) wajib dijawab; membuka jalur publik tidak boleh
      // melonggarkan validasi isinya.
      await expect(
        service.submitPublic(1, { answers: [{ questionId: 102, teks: 'x' }], setuju: true }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.surveyResponse.create).not.toHaveBeenCalled();
    });

    it('submitPublic tidak memanggil assertConsented, sebab penjaganya di DTO', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(surveiAnonim());
      (prisma.surveyResponse.create as jest.Mock).mockResolvedValue({
        id: 9,
        surveyId: 1,
        submittedAt: new Date(),
        answers: [],
      });

      await service.submitPublic(1, { answers: [{ questionId: 101, nilai: 4 }], setuju: true });

      // `assertConsented` membaca `users.consentAt`, dan pengirim tanpa sesi tak
      // punya baris `users`, jadi ia memang tak dapat dipakai di jalur ini.
      // Sejak 8 September 2026 persetujuannya DITEGAKKAN di tempat lain:
      // `setuju: true` wajib pada SubmitPublicResponseDto (ditolak 400 oleh
      // ValidationPipe) dan waktunya direkam per respons di `consentAt`.
      // Jadi ini bukan lagi "gerbang belum aktif", melainkan gerbang yang
      // berada di lapis yang benar.
      expect(consent.assertConsented).not.toHaveBeenCalled();
    });

    /**
     * PERSETUJUAN PDP & DEMOGRAFIS PADA JALUR PUBLIK (8 September 2026).
     *
     * Tim pengguna mengonfirmasi bahwa aplikasi ini memang memerlukan
     * persetujuan UU PDP. Kolom `survey_responses.consent_at` sudah ada di
     * skema sejak dahulu dengan komentar yang menyatakan ia menunggu
     * konfirmasi itu; sekarang ia terisi.
     */
    const responsBaru = () => ({ id: 9, surveyId: 1, submittedAt: new Date(), answers: [] });

    const dataYangDitulis = () =>
      (prisma.surveyResponse.create as jest.Mock).mock.calls[0][0].data as Record<string, unknown>;

    it('submitPublic menulis consentAt saat pengiriman diterima', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(surveiAnonim());
      (prisma.surveyResponse.create as jest.Mock).mockResolvedValue(responsBaru());

      await service.submitPublic(1, { answers: [{ questionId: 101, nilai: 4 }], setuju: true });

      expect(dataYangDitulis().consentAt).toBeInstanceOf(Date);
    });

    it('submitPublic menulis demografis yang dikirim', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(surveiAnonim());
      (prisma.surveyResponse.create as jest.Mock).mockResolvedValue(responsBaru());

      await service.submitPublic(1, {
        answers: [{ questionId: 101, nilai: 4 }],
        setuju: true,
        jenisKelamin: JenisKelamin.perempuan,
        kelompokUmur: '26-35',
      });

      const data = dataYangDitulis();
      expect(data.jenisKelamin).toBe(JenisKelamin.perempuan);
      expect(data.kelompokUmur).toBe('26-35');
    });

    it('tanpa demografis: kolomnya null, BUKAN undefined', async () => {
      // Bedanya penting. Pada Prisma, `undefined` berarti "jangan sentuh
      // kolomnya", dan pada `create` itu menyisakan nilai baku. `null`
      // menyatakan tersurat bahwa pengisi memilih tidak memberi datanya, dan
      // itu yang membedakan "memilih anonim" dari "medannya lupa dikirim".
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(surveiAnonim());
      (prisma.surveyResponse.create as jest.Mock).mockResolvedValue(responsBaru());

      await service.submitPublic(1, { answers: [{ questionId: 101, nilai: 4 }], setuju: true });

      const data = dataYangDitulis();
      expect(data.jenisKelamin).toBeNull();
      expect(data.kelompokUmur).toBeNull();
    });

    it('KONTROL: userId & dedupeUserId tetap null sesudah perubahan ini', async () => {
      // Perubahan ini tak boleh diam-diam menautkan respons publik ke sebuah
      // akun, dan tak boleh menyalakan anti-duplikat yang memang mati di jalur
      // ini (tak ada pegangan tanpa sesi; penandanya di peramban).
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(surveiAnonim());
      (prisma.surveyResponse.create as jest.Mock).mockResolvedValue(responsBaru());

      await service.submitPublic(1, { answers: [{ questionId: 101, nilai: 4 }], setuju: true });

      const data = dataYangDitulis();
      expect(data.userId).toBeNull();
      expect(data.dedupeUserId).toBeNull();
    });

    it('KONTROL: submit bersesi TETAP menuntut persetujuan & menulis userId', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(surveiAnonim());
      (prisma.surveyResponse.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.surveyResponse.create as jest.Mock).mockResolvedValue({
        id: 10,
        surveyId: 1,
        submittedAt: new Date(),
        answers: [],
      });

      await service.submit(1, { answers: [{ questionId: 101, nilai: 4 }] }, responden(10));

      expect(consent.assertConsented).toHaveBeenCalledWith(responden(10));
      expect(prisma.surveyResponse.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ userId: 10 }) }),
      );
    });

    it('submitPublic menulis nama & nomor HP yang dikirim', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(surveiAnonim());
      (prisma.surveyResponse.create as jest.Mock).mockResolvedValue(responsBaru());

      await service.submitPublic(1, {
        answers: [{ questionId: 101, nilai: 4 }],
        setuju: true,
        nama: 'Budi Santoso',
        nomorHp: '081234567890',
      });

      const data = dataYangDitulis();
      expect(data.nama).toBe('Budi Santoso');
      expect(data.nomorHp).toBe('081234567890');
    });

    it('tanpaDataDiri membuang data diri yang tetap dikirim di payload', async () => {
      // Payload yang menyatakan anonim SEKALIGUS membawa data diri berperilaku
      // seperti yang dikatakan pilihannya, bukan seperti yang dikatakan sisa
      // payloadnya. Gerbang di frontend memang sudah menghilangkan medannya,
      // tapi permintaan langsung tak melewati gerbang itu.
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(surveiAnonim());
      (prisma.surveyResponse.create as jest.Mock).mockResolvedValue(responsBaru());

      await service.submitPublic(1, {
        answers: [{ questionId: 101, nilai: 4 }],
        setuju: true,
        tanpaDataDiri: true,
        nama: 'Budi Santoso',
        nomorHp: '081234567890',
        jenisKelamin: JenisKelamin.laki_laki,
        kelompokUmur: '36-45',
      });

      const data = dataYangDitulis();
      expect(data.nama).toBeNull();
      expect(data.nomorHp).toBeNull();
      expect(data.jenisKelamin).toBeNull();
      expect(data.kelompokUmur).toBeNull();
    });
  });

  /**
   * DATA DIRI PADA JALUR BERSESI (8 September 2026).
   *
   * Disalin dari akun, tidak diterima dari payload: gerbang bagi pengguna
   * bersesi hanya menampilkan kotak anonim (permintaan tersurat pengguna), jadi
   * isinya harus datang dari sumber yang tak dapat dikarang pemanggil.
   */
  describe('data diri jalur bersesi', () => {
    const responsBaru = () => ({ id: 11, surveyId: 1, submittedAt: new Date(), answers: [] });

    const dataYangDitulis = () =>
      (prisma.surveyResponse.create as jest.Mock).mock.calls[0][0].data as Record<string, unknown>;

    const siapkan = () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(aktifSurvey());
      (prisma.surveyResponse.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.surveyResponse.create as jest.Mock).mockResolvedValue(responsBaru());
    };

    it('menyalin nama & demografis dari akun pengirim', async () => {
      siapkan();

      await service.submit(1, { answers: [{ questionId: 101, nilai: 4 }] }, responden(7));

      expect(prisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 7 } }),
      );
      const data = dataYangDitulis();
      expect(data.nama).toBe('Siti Aminah');
      expect(data.jenisKelamin).toBe(JenisKelamin.perempuan);
      expect(data.kelompokUmur).toBe('26-35');
    });

    it('tanpaDataDiri: kolomnya null DAN akunnya tidak dibaca sama sekali', async () => {
      // Bukan cuma soal kolom. Tidak membaca akunnya berarti data itu tak pernah
      // meninggalkan basis data, dan itu jaminan yang lebih kuat daripada
      // membaca lalu membuangnya.
      siapkan();

      await service.submit(
        1,
        { answers: [{ questionId: 101, nilai: 4 }], tanpaDataDiri: true },
        responden(7),
      );

      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      const data = dataYangDitulis();
      expect(data.nama).toBeNull();
      expect(data.jenisKelamin).toBeNull();
      expect(data.kelompokUmur).toBeNull();
    });

    it('akun tanpa baris respondent_profiles: nama tetap tercatat, demografis null', async () => {
      // Keadaan yang PALING SERING terjadi, bukan kasus pinggir: tak ada satu
      // pun UI yang menulis `respondent_profiles`, jadi hampir semua akun tak
      // punya barisnya. Ketiadaan itu keadaan normal, bukan galat.
      siapkan();
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        nama: 'Agus Wijaya',
        respondentProfile: null,
      });

      await service.submit(1, { answers: [{ questionId: 101, nilai: 4 }] }, responden(7));

      const data = dataYangDitulis();
      expect(data.nama).toBe('Agus Wijaya');
      expect(data.jenisKelamin).toBeNull();
      expect(data.kelompokUmur).toBeNull();
    });

    /**
     * DIBALIK LAGI, 1 Oktober 2026 (petang), atas permintaan tersurat pengguna:
     * "halaman sebelum mengisi survei tidak menampilkan form apapun".
     *
     * Uji ini sempat berbunyi "nomorHp ditulis DARI PAYLOAD", dan alasannya
     * waktu itu benar: Helpdesk dianggap tak mengirim nomor telepon, terukur
     * pada metadata penyedia yang `claims_supported`-nya tak memuat
     * `phone_number`. ITU TERNYATA BUKAN JAWABAN YANG LENGKAP. Payload
     * `userinfo` sungguhan memuat `identity.phone_number`, dan spesifikasi OIDC
     * memang menyebut `claims_supported` sebagai petunjuk, bukan jaminan
     * tertutup. Sejak nomornya ada di akun, meminta pengisi mengetiknya berarti
     * menyuruh orang mengulang yang sudah diketahui sistem.
     *
     * Nomor HP kini DISALIN DARI AKUN seperti nama dan demografis, sehingga
     * seluruh data diri jalur bersesi aman oleh konstruksi: tak satu pun dapat
     * dikarang lewat permintaan langsung.
     */
    it('nomorHp DISALIN DARI AKUN, bukan dari payload', async () => {
      siapkan();
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        nama: 'Siti Aminah',
        nomorHp: enkripsiKolom('+62895396662038', KUNCI_UJI_KOLOM),
        jenisKelamin: JenisKelamin.perempuan,
        respondentProfile: null,
      });

      await service.submit(1, { answers: [{ questionId: 101, nilai: 4 }] }, responden(7));

      expect(dataYangDitulis().nomorHp).toBe('+62895396662038');
    });

    /**
     * PAGAR TERPENTING pada perubahan ini. DTO jalur bersesi sudah membuang
     * medan `nomorHp`, tetapi layanan ini tak boleh bergantung pada satu
     * lapisan saja: payload yang menyelundupkan nomor tak boleh berakhir di
     * basis data sebagai data diri orang lain.
     */
    it('nomorHp yang diselundupkan lewat payload DIABAIKAN', async () => {
      siapkan();
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        nama: 'Siti Aminah',
        nomorHp: enkripsiKolom('+62895396662038', KUNCI_UJI_KOLOM),
        jenisKelamin: null,
        respondentProfile: null,
      });

      await service.submit(
        1,
        { answers: [{ questionId: 101, nilai: 4 }], nomorHp: '080000000000' } as never,
        responden(7),
      );

      expect(dataYangDitulis().nomorHp).toBe('+62895396662038');
    });

    it('akun tanpa nomor HP: kolomnya null, BUKAN undefined', async () => {
      // `undefined` pada `create` Prisma berarti "pakai nilai baku". `null`
      // menyatakan tersurat bahwa nomornya memang tak ada -- keadaan normal,
      // sebab Helpdesk tak menjamin medan itu terisi.
      siapkan();
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        nama: 'Siti Aminah',
        nomorHp: null,
        jenisKelamin: null,
        respondentProfile: null,
      });

      await service.submit(1, { answers: [{ questionId: 101, nilai: 4 }] }, responden(7));

      expect(dataYangDitulis().nomorHp).toBeNull();
    });

    it('KONTROL: tanpaDataDiri mengosongkan nomorHp walau akunnya punya', async () => {
      siapkan();
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        nama: 'Siti Aminah',
        nomorHp: enkripsiKolom('+62895396662038', KUNCI_UJI_KOLOM),
        jenisKelamin: JenisKelamin.perempuan,
        respondentProfile: null,
      });

      await service.submit(
        1,
        { answers: [{ questionId: 101, nilai: 4 }], tanpaDataDiri: true },
        responden(7),
      );

      const data = dataYangDitulis();
      expect(data.nomorHp).toBeNull();
      expect(data.nama).toBeNull();
      expect(data.jenisKelamin).toBeNull();
    });

    /**
     * URUTAN SUMBER, keputusan tersurat pengguna: Helpdesk dulu,
     * `respondent_profiles` sebagai cadangan. Diukur sebelum diputuskan --
     * pada basis data lokal 1 Oktober 2026 hanya 1 dari 10 akun punya baris
     * `respondent_profiles`, dan 7 dari 8 respons bersesi tersimpan tanpa
     * jenis kelamin. Sumber lama memang hampir selalu kosong.
     */
    it('jenis kelamin diambil dari akun Helpdesk lebih dulu', async () => {
      siapkan();
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        nama: 'Siti Aminah',
        nomorHp: null,
        jenisKelamin: JenisKelamin.perempuan,
        respondentProfile: { jenisKelamin: JenisKelamin.laki_laki, kelompokUmur: '26-35' },
      });

      await service.submit(1, { answers: [{ questionId: 101, nilai: 4 }] }, responden(7));

      expect(dataYangDitulis().jenisKelamin).toBe(JenisKelamin.perempuan);
    });

    it('respondent_profiles dipakai bila akun Helpdesk tak membawanya', async () => {
      siapkan();
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        nama: 'Siti Aminah',
        nomorHp: null,
        jenisKelamin: null,
        respondentProfile: { jenisKelamin: JenisKelamin.laki_laki, kelompokUmur: '26-35' },
      });

      await service.submit(1, { answers: [{ questionId: 101, nilai: 4 }] }, responden(7));

      const data = dataYangDitulis();
      expect(data.jenisKelamin).toBe(JenisKelamin.laki_laki);
      // Kelompok umur TETAP dari respondent_profiles: Helpdesk tak
      // mengirimkannya sama sekali (yang ada `tanggal_lahir`, dan batas
      // kelompoknya keputusan pengguna, bukan tebakan kode ini).
      expect(data.kelompokUmur).toBe('26-35');
    });

    it('akun yang tidak ditemukan tidak menggagalkan pengiriman', async () => {
      // Jawaban survei tak boleh hilang gara-gara data diri yang cuma pelengkap.
      siapkan();
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await service.submit(1, { answers: [{ questionId: 101, nilai: 4 }] }, responden(7));

      expect(dataYangDitulis().nama).toBeNull();
    });

    it('KONTROL: pra-cek duplikat menolak SEBELUM akun dibaca', async () => {
      // Urutan kueri. Permintaan yang sudah pasti berakhir 409 tak perlu
      // membayar satu kueri tambahan.
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(aktifSurvey());
      (prisma.surveyResponse.findFirst as jest.Mock).mockResolvedValue({ id: 5 });

      await expect(
        service.submit(1, { answers: [{ questionId: 101, nilai: 4 }] }, responden(7)),
      ).rejects.toThrow(ConflictException);

      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });
  });

  /**
   * Pemberitahuan jawaban survei (13 September 2026). Modul ini SEBELUMNYA tak
   * menyinggung notifikasi sama sekali -- fitur yang belum ada, bukan kiriman
   * yang gagal sampai.
   *
   * Keputusan tonggak (jawaban pertama, lalu 10/25/50/100) ada di
   * NotificationsService dan diuji di sana. Di sini yang dijaga hanya
   * sambungannya: dipanggil, dengan survei & pengisi yang benar, dan hanya
   * ketika satu jawaban benar-benar tersimpan.
   */
  describe('pemberitahuan jawaban survei', () => {
    const responsTersimpan = {
      id: 1,
      surveyId: 1,
      submittedAt: new Date(),
      answers: [],
    };

    it('submit bersesi -> memberi tahu, membawa survei & id pengisinya', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(
        aktifSurvey({ judul: 'SKM Loket', questions: [skalaQ(101)] }),
      );
      (prisma.surveyResponse.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.surveyResponse.create as jest.Mock).mockResolvedValue(responsTersimpan);

      await service.submit(1, { answers: [{ questionId: 101, nilai: 4 }] }, responden(10));

      expect(notifications.notifySurveyResponse).toHaveBeenCalledWith(
        { id: 1, judul: 'SKM Loket', opdId: 5 },
        10,
      );
    });

    /**
     * Urutan ini menentukan isi notifikasinya: jumlah jawaban dihitung di
     * dalam NotificationsService, jadi memanggilnya SEBELUM baris tersimpan
     * membuat "jawaban pertama" tak pernah berbunyi.
     */
    it('dipanggil SESUDAH respons tersimpan, bukan sebelumnya', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(
        aktifSurvey({ questions: [skalaQ(101)] }),
      );
      (prisma.surveyResponse.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.surveyResponse.create as jest.Mock).mockResolvedValue(responsTersimpan);

      await service.submit(1, { answers: [{ questionId: 101, nilai: 4 }] }, responden(10));

      const urutanSimpan = (prisma.surveyResponse.create as jest.Mock).mock.invocationCallOrder[0];
      const urutanKabar = (notifications.notifySurveyResponse as jest.Mock).mock
        .invocationCallOrder[0];
      expect(urutanKabar).toBeGreaterThan(urutanSimpan);
    });

    it('submitPublic -> memberi tahu dengan pengisi null (tanpa sesi, tak ada baris users)', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(
        aktifSurvey({ izinkanAnonim: true, judul: 'SKM Loket', questions: [skalaQ(101)] }),
      );
      (prisma.surveyResponse.create as jest.Mock).mockResolvedValue(responsTersimpan);

      await service.submitPublic(1, { answers: [{ questionId: 101, nilai: 4 }], setuju: true });

      expect(notifications.notifySurveyResponse).toHaveBeenCalledWith(
        { id: 1, judul: 'SKM Loket', opdId: 5 },
        null,
      );
    });

    it('pengiriman yang DITOLAK (duplikat 409) tidak memberi tahu siapa pun', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(
        aktifSurvey({ questions: [skalaQ(101)] }),
      );
      (prisma.surveyResponse.findFirst as jest.Mock).mockResolvedValue({ id: 99 });

      await expect(
        service.submit(1, { answers: [{ questionId: 101, nilai: 4 }] }, responden(10)),
      ).rejects.toThrow(ConflictException);
      expect(notifications.notifySurveyResponse).not.toHaveBeenCalled();
    });

    it('pengiriman yang DITOLAK (jawaban tak lengkap) tidak memberi tahu siapa pun', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(
        aktifSurvey({ questions: [skalaQ(101)] }),
      );
      (prisma.surveyResponse.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.submit(1, { answers: [] }, responden(10))).rejects.toThrow(
        BadRequestException,
      );
      expect(notifications.notifySurveyResponse).not.toHaveBeenCalled();
    });
  });

  /**
   * PEMBATALAN SINGGAHAN IKM (9 Oktober 2026, pilihan pengguna: jalur A).
   *
   * Cacat yang menyebabkannya nyata dan terukur, bukan hipotetis: `ikm.e2e-spec.ts`
   * memanggil `GET /surveys/:id/results` ketika survei belum berresponden, yang
   * menyinggahkan sebaran KOSONG selama 60 detik; dua jawaban lalu masuk dan
   * `total` tetap 0. Uji itu bernama "live-compute", jadi harapan produknya
   * memang seketika.
   *
   * Rata-ratanya tak ikut memerah hanya karena kebetulan: nilai `null` sengaja
   * tak pernah disimpan, sehingga survei kosong tak menyinggahkan apa pun.
   * Begitu satu jawaban ada, rata-ratanya basi juga -- jadi KEDUA kunci
   * dibatalkan di sini, bukan hanya yang tertangkap uji.
   *
   * DIPASANG DI JALUR TULIS, bukan dengan memperpendek TTL: TTL sekecil apa pun
   * masih jendela basi, dan satu `DEL` per jawaban jauh lebih murah daripada
   * menghitung ulang IKM setiap permintaan baca.
   */
  describe('pembatalan singgahan IKM saat jawaban masuk', () => {
    const responsTersimpan = { id: 1, surveyId: 1, submittedAt: new Date(), answers: [] };
    /**
     * SELURUH kunci, bukan sejumlah tertentu yang dihafal: daftarnya bertambah
     * dari dua menjadi tiga pada 9 Oktober 2026 ketika `computeResult` ikut
     * disinggahkan, dan ketiga uji di bawah MEMERAH saat itu. Itu memang
     * gunanya -- menambah hitungan tersinggahkan tanpa menambah pembatalannya
     * adalah cara paling mudah membuat angka basi, dan uji inilah yang
     * menghentikannya.
     */
    const kunciTerhapus = () => (singgahan.hapus as jest.Mock).mock.calls.flat().sort() as string[];

    beforeEach(() => (singgahan.hapus as jest.Mock).mockClear());

    it('submit bersesi membatalkan SELURUH kunci survei itu', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(
        aktifSurvey({ questions: [skalaQ(101)] }),
      );
      (prisma.surveyResponse.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.surveyResponse.create as jest.Mock).mockResolvedValue(responsTersimpan);

      await service.submit(1, { answers: [{ questionId: 101, nilai: 4 }] }, responden(10));

      expect(kunciTerhapus()).toEqual(['ikm-hasil:1', 'ikm-rata:1', 'ikm-sebaran:1']);
    });

    /**
     * Jalur publik ikut, dan ini bukan kelengkapan belaka: survei berkode QR di
     * loket dijawab LEWAT JALUR INI, jadi melewatkannya berarti justru survei
     * yang paling sering dijawab yang angkanya paling basi.
     */
    it('submitPublic membatalkan SELURUH kunci survei itu', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(
        aktifSurvey({ izinkanAnonim: true, questions: [skalaQ(101)] }),
      );
      (prisma.surveyResponse.create as jest.Mock).mockResolvedValue(responsTersimpan);

      await service.submitPublic(1, { answers: [{ questionId: 101, nilai: 4 }], setuju: true });

      expect(kunciTerhapus()).toEqual(['ikm-hasil:1', 'ikm-rata:1', 'ikm-sebaran:1']);
    });

    /**
     * URUTANNYA MENENTUKAN BENAR-SALAHNYA. Membatalkan SEBELUM baris tersimpan
     * membuka balapan: pembaca lain dapat mengisi ulang singgahan dengan angka
     * pra-jawaban di antara dua langkah itu, dan hasilnya basi persis seperti
     * sebelum perbaikan ini -- dengan `DEL` yang terlihat sudah dipanggil.
     */
    it('dibatalkan SESUDAH baris tersimpan, bukan sebelumnya', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(
        aktifSurvey({ questions: [skalaQ(101)] }),
      );
      (prisma.surveyResponse.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.surveyResponse.create as jest.Mock).mockResolvedValue(responsTersimpan);

      await service.submit(1, { answers: [{ questionId: 101, nilai: 4 }] }, responden(10));

      const urutanSimpan = (prisma.surveyResponse.create as jest.Mock).mock.invocationCallOrder[0];
      const urutanBatal = (singgahan.hapus as jest.Mock).mock.invocationCallOrder[0];
      expect(urutanBatal).toBeGreaterThan(urutanSimpan);
    });

    it('survei lain tak tersentuh: kuncinya dibangun dari surveyId yang dijawab', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(
        aktifSurvey({ id: 42, izinkanAnonim: true, questions: [skalaQ(101)] }),
      );
      (prisma.surveyResponse.create as jest.Mock).mockResolvedValue({
        ...responsTersimpan,
        surveyId: 42,
      });

      await service.submitPublic(42, { answers: [{ questionId: 101, nilai: 4 }], setuju: true });

      expect(kunciTerhapus()).toEqual(['ikm-hasil:42', 'ikm-rata:42', 'ikm-sebaran:42']);
    });
  });
});
