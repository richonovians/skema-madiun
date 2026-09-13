import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { JenisKelamin, QuestionType, Role, SurveyStatus } from '@prisma/client';
import type { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import type { ConsentService } from '../auth/consent.service';
import type { NotificationsService } from '../notifications/notifications.service';
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
  const service = new ResponsesService(prisma, consent, notifications);

  const AKUN_BERPROFIL = {
    nama: 'Siti Aminah',
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

    it('nomorHp TIDAK pernah ditulis pada jalur bersesi', async () => {
      // Tak ada sumbernya, dan itu terukur: Helpdesk tak mengirim nomor telepon
      // dan `users` tak punya kolomnya. Menulis null di sini akan menyamar
      // sebagai data yang dicoba diambil lalu tak ada.
      siapkan();

      await service.submit(1, { answers: [{ questionId: 101, nilai: 4 }] }, responden(7));

      expect('nomorHp' in dataYangDitulis()).toBe(false);
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
});
