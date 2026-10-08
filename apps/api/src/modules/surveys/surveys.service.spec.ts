import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  JenisSurvei,
  MetodeNilai,
  QuestionType,
  Role,
  SurveyStatus,
  TujuanSurvei,
} from '@prisma/client';
import type { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { IkmService } from '../ikm/ikm.service';
import { CreateSurveyDto } from './dto/create-survey.dto';
import { ListSurveyQueryDto } from './dto/list-survey-query.dto';
import { SurveysService } from './surveys.service';

const opdUser = (opdId: number | null): CurrentUser => ({
  userId: 1,
  roles: [Role.opd],
  actingRole: Role.opd,
  opdId,
});
const superUser = (): CurrentUser => ({
  userId: 9,
  roles: [Role.kabupaten],
  actingRole: Role.kabupaten,
  opdId: null,
});

const surveyRow = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  opdId: 5,
  judul: 'Survei A',
  periode: '2026-Q1',
  status: SurveyStatus.draft,
  jenis: JenisSurvei.custom,
  // `assertSurveyEditable` memeriksa `deletedAt !== null`; fixture tanpa medan
  // ini akan ditolak sebagai "survei di Sampah", galat yang menyesatkan.
  deletedAt: null,
  allowMultipleSubmit: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('SurveysService', () => {
  const prisma = {
    survey: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    opd: { findUnique: jest.fn() },
    question: { findMany: jest.fn() },
    surveyResponse: { count: jest.fn(), aggregate: jest.fn() },
    $transaction: jest.fn(),
  } as unknown as PrismaService;
  const ikmService = {
    snapshot: jest.fn(),
    getSummary: jest.fn().mockResolvedValue({ respondentsCount: 0, nilaiIkm: null }),
  } as unknown as IkmService;
  const service = new SurveysService(prisma, ikmService);

  beforeEach(() => {
    jest.clearAllMocks();
    // Bakunya NOL jawaban: keadaan seluruh uji yang ditulis sebelum aturan ubah
    // bertingkat ada. Uji yang menguji penguncian menyebut angkanya sendiri.
    (prisma.surveyResponse.count as jest.Mock).mockResolvedValue(0);
    // Bakunya BELUM ADA respons, sejalan dengan `count` nol di atas. Uji yang
    // memang menguji tanggalnya menyebut nilainya sendiri.
    (prisma.surveyResponse.aggregate as jest.Mock).mockResolvedValue({
      _max: { submittedAt: null },
    });
    // `$transaction` dipakai DUA bentuk di service ini: deretan janji (findAll,
    // findActive, findTrashed) dan panggilan balik (update, sejak survei utama
    // per OPD). Tiruan ini melayani bentuk panggilan balik dengan meneruskan
    // `prisma` sebagai `tx`, sehingga asersi tetap mengamati `prisma.survey.*`
    // yang sama. Uji bentuk deretan menimpanya dengan `mockResolvedValue`.
    (prisma.$transaction as jest.Mock).mockImplementation((arg: unknown) =>
      typeof arg === 'function'
        ? (arg as (tx: PrismaService) => unknown)(prisma)
        : Promise.resolve(arg),
    );
  });

  it('findAll (Admin OPD) mengembalikan PaginatedResult terfilter OPD-nya', async () => {
    (prisma.$transaction as jest.Mock).mockResolvedValue([[surveyRow()], 1]);
    (ikmService.getSummary as jest.Mock).mockResolvedValue({
      respondentsCount: 0,
      nilaiIkm: null,
    });
    const result = await service.findAll({ page: 1, limit: 20 } as ListSurveyQueryDto, opdUser(5));
    expect(result.items).toHaveLength(1);
    expect(result.pagination.total).toBe(1);
  });

  // Filter `opdId` (2026-08-20) untuk Superuser yang memerankan satu OPD.
  it('findAll: filter opdId di-AND-kan, bukan menimpa penyaring kepemilikan', async () => {
    (prisma.$transaction as jest.Mock).mockResolvedValue([[], 0]);
    await service.findAll({ page: 1, limit: 20, opdId: 99 } as ListSurveyQueryDto, opdUser(5));
    // Kepemilikan (opdId 5) TETAP ada; id 99 cuma menambah syarat sehingga
    // hasilnya kosong -- bukan survei OPD 99.
    expect(prisma.survey.findMany).toHaveBeenCalledWith(
      // `deletedAt: null` ikut disebut TERSURAT di sini, bukan dilonggarkan
      // menjadi objectContaining: penyaring sampah pada daftar survei adalah
      // perilaku yang harus memerah kalau seseorang membuangnya.
      expect.objectContaining({ where: { opdId: 5, deletedAt: null, AND: [{ opdId: 99 }] } }),
    );
  });

  it('findAll (INT-9) menyisipkan respondentsCount & nilaiIkm dari IkmService.getSummary', async () => {
    (prisma.$transaction as jest.Mock).mockResolvedValue([[surveyRow({ id: 7 })], 1]);
    (ikmService.getSummary as jest.Mock).mockResolvedValue({
      respondentsCount: 12,
      nilaiIkm: 81.25,
    });
    const result = await service.findAll({ page: 1, limit: 20 } as ListSurveyQueryDto, opdUser(5));
    expect(result.items[0].respondentsCount).toBe(12);
    expect(result.items[0].nilaiIkm).toBe(81.25);
    expect(ikmService.getSummary).toHaveBeenCalledWith(expect.objectContaining({ id: 7 }));
  });

  it('findAll menyisipkan nilaiRataRata, juga untuk survei yang IKM-nya null (tanpa 9 unsur baku)', async () => {
    // Di data pengembangan, survei aktif yang sudah menerima jawaban tetapi tak
    // memuat 9 unsur baku menampilkan "-" di setiap layar. Rata-rata jawaban
    // skalanya tetap terhitung, dan tabel survei Kabupaten membacanya dari sini.
    (prisma.$transaction as jest.Mock).mockResolvedValue([
      [surveyRow({ id: 7 }), surveyRow({ id: 8 })],
      2,
    ]);
    (ikmService.getSummary as jest.Mock)
      .mockResolvedValueOnce({ respondentsCount: 5, nilaiIkm: null, nilaiRataRata: 3.84 })
      .mockResolvedValueOnce({ respondentsCount: 0, nilaiIkm: null, nilaiRataRata: null });

    const result = await service.findAll({ page: 1, limit: 20 } as ListSurveyQueryDto, opdUser(5));

    expect(result.items[0].nilaiIkm).toBeNull();
    expect(result.items[0].nilaiRataRata).toBe(3.84);
    // Tak ada jawaban skala -> null, bukan 0.
    expect(result.items[1].nilaiRataRata).toBeNull();
  });

  it('findActive (INT-17) menyisipkan opdNama & questionsCount, tanpa membocorkan objek opd/_count mentah', async () => {
    (prisma.$transaction as jest.Mock).mockResolvedValue([
      [
        surveyRow({
          status: SurveyStatus.aktif,
          opd: { nama: 'Dinas Kesehatan' },
          _count: { questions: 9 },
        }),
      ],
      1,
    ]);

    const result = await service.findActive({ page: 1, limit: 20 });

    expect(result.items[0].opdNama).toBe('Dinas Kesehatan');
    expect(result.items[0].questionsCount).toBe(9);
    expect((result.items[0] as unknown as { opd?: unknown }).opd).toBeUndefined();
    expect((result.items[0] as unknown as { _count?: unknown })._count).toBeUndefined();
    expect(prisma.survey.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: SurveyStatus.aktif, deletedAt: null },
        include: { opd: { select: { nama: true } }, _count: { select: { questions: true } } },
      }),
    );
  });

  it('findActive (INT-45) dgn opdId -> where menyertakan filter opdId (instansi->survei aktif)', async () => {
    (prisma.$transaction as jest.Mock).mockResolvedValue([
      [
        surveyRow({
          status: SurveyStatus.aktif,
          opd: { nama: 'Dinas Kesehatan' },
          _count: { questions: 9 },
        }),
      ],
      1,
    ]);

    await service.findActive({ page: 1, limit: 20, opdId: 5 });

    expect(prisma.survey.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: SurveyStatus.aktif, deletedAt: null, opdId: 5 } }),
    );
  });

  it('create (Admin OPD) memakai opdId miliknya', async () => {
    (prisma.opd.findUnique as jest.Mock).mockResolvedValue({ id: 5 });
    (prisma.survey.create as jest.Mock).mockResolvedValue(surveyRow());
    const dto: CreateSurveyDto = {
      judul: 'Survei A',
      periode: '2026-Q1',
      jenis: JenisSurvei.custom,
      tujuan: TujuanSurvei.kepuasan,
      metodeNilai: MetodeNilai.rata_rata,
    };
    const result = await service.create(dto, opdUser(5));
    expect(result.opdId).toBe(5);
    expect(prisma.survey.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ opdId: 5 }) }),
    );
  });

  it('create (kabupaten/superuser) tanpa opdId → BadRequest', async () => {
    const dto: CreateSurveyDto = {
      judul: 'A',
      periode: '2026-Q1',
      jenis: JenisSurvei.custom,
      tujuan: TujuanSurvei.kepuasan,
      metodeNilai: MetodeNilai.rata_rata,
    };
    await expect(service.create(dto, superUser())).rejects.toThrow(BadRequestException);
  });

  it('findOne menyertakan respondentsCount, bukan hanya kolom mentah surveinya', async () => {
    // Builder memakai angka ini untuk mengunci susunan pertanyaan. Sebelum 11
    // September 2026 hanya GET /surveys yang mengisinya, sehingga builder
    // SELALU membaca 0 dan penguncian tak pernah menyala.
    (prisma.survey.findFirst as jest.Mock).mockResolvedValue(
      surveyRow({ status: SurveyStatus.aktif }),
    );
    (ikmService.getSummary as jest.Mock).mockResolvedValue({
      respondentsCount: 142,
      nilaiIkm: 81.25,
    });

    const hasil = await service.findOne(1, opdUser(5));

    expect(hasil.respondentsCount).toBe(142);
  });

  it('findOne menyertakan nilaiRataRata (kartu ringkasan halaman respons membacanya dari sini)', async () => {
    (prisma.survey.findFirst as jest.Mock).mockResolvedValue(
      surveyRow({ status: SurveyStatus.aktif }),
    );
    (ikmService.getSummary as jest.Mock).mockResolvedValue({
      respondentsCount: 5,
      nilaiIkm: null,
      nilaiRataRata: 3.84,
    });

    const hasil = await service.findOne(1, opdUser(5));

    expect(hasil.nilaiRataRata).toBe(3.84);
  });

  /**
   * KAPAN RESPONS TERAKHIR MASUK (4 Oktober 2026).
   *
   * Layar daftar respons kini dipaginasi sungguhan, dan itu mematahkan dua
   * angka pada kartu ringkasannya: keduanya dulu dihitung dari 100 baris yang
   * kebetulan termuat. Sesudah paginasi, "Respons Terakhir" pada halaman 1
   * yang menaik justru akan menampilkan respons PALING LAMA -- bukan sekadar
   * kurang tepat, melainkan terbalik.
   *
   * Diambil dari survei, bukan dari daftar responsnya, karena di sinilah
   * frontend sudah memanggil satu kali untuk judul & periode; menaruhnya di
   * meta daftar menuntut PaginatedResult berubah bentuk untuk SELURUH API.
   *
   * `null` ketika belum ada satu pun respons -- `_max` atas himpunan kosong
   * memang null, dan itu keadaan yang benar untuk ditampilkan sebagai "belum
   * ada", bukan sebagai tanggal palsu.
   */
  it('findOne menyertakan kapan respons terakhir masuk', async () => {
    (prisma.survey.findFirst as jest.Mock).mockResolvedValue(
      surveyRow({ status: SurveyStatus.aktif }),
    );
    (ikmService.getSummary as jest.Mock).mockResolvedValue({
      respondentsCount: 3,
      nilaiIkm: 81.25,
    });
    (prisma.surveyResponse.aggregate as jest.Mock).mockResolvedValue({
      _max: { submittedAt: new Date('2026-10-03T07:15:00.000Z') },
    });

    const hasil = await service.findOne(1, opdUser(5));

    expect(hasil.terakhirMasuk).toEqual(new Date('2026-10-03T07:15:00.000Z'));
    expect(prisma.surveyResponse.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { surveyId: 1 }, _max: { submittedAt: true } }),
    );
  });

  it('findOne: survei tanpa respons → terakhirMasuk null, bukan tanggal karangan', async () => {
    (prisma.survey.findFirst as jest.Mock).mockResolvedValue(
      surveyRow({ status: SurveyStatus.draft }),
    );
    (ikmService.getSummary as jest.Mock).mockResolvedValue({
      respondentsCount: 0,
      nilaiIkm: null,
    });
    (prisma.surveyResponse.aggregate as jest.Mock).mockResolvedValue({
      _max: { submittedAt: null },
    });

    const hasil = await service.findOne(1, opdUser(5));

    expect(hasil.terakhirMasuk).toBeNull();
  });

  // ATURAN BERGANTI 11 September 2026: "hanya draf" menjadi bertingkat menurut
  // ada-tidaknya jawaban. Tiga uji di bawah menggantikan satu uji lama yang
  // menolak SETIAP perubahan pada survei non-draf.
  it('update survei DITUTUP → BadRequest (hasil IKM-nya sudah terbit)', async () => {
    (prisma.survey.findFirst as jest.Mock).mockResolvedValue(
      surveyRow({ status: SurveyStatus.ditutup }),
    );
    await expect(service.update(1, { judul: 'X' }, opdUser(5))).rejects.toThrow(
      BadRequestException,
    );
  });

  it('update judul survei AKTIF yang sudah dijawab: BOLEH', async () => {
    // Judul & izin pengisian hanya mengatur pengisian berikutnya; tak satu pun
    // nilai jawaban yang sudah masuk bergeser karenanya.
    (prisma.survey.findFirst as jest.Mock).mockResolvedValue(
      surveyRow({ status: SurveyStatus.aktif }),
    );
    (prisma.surveyResponse.count as jest.Mock).mockResolvedValue(142);
    (prisma.survey.update as jest.Mock).mockResolvedValue(surveyRow({ judul: 'X' }));

    await expect(service.update(1, { judul: 'X' }, opdUser(5))).resolves.toBeDefined();
  });

  it('mengganti PERIODE survei aktif yang sudah dijawab: DITOLAK', async () => {
    // Periode adalah bagian kunci unik ikm_results(surveyId, periode):
    // menggesernya memindahkan hasil yang sudah terhitung ke periode lain.
    (prisma.survey.findFirst as jest.Mock).mockResolvedValue(
      surveyRow({ status: SurveyStatus.aktif, periode: '2026-Q1' }),
    );
    (prisma.surveyResponse.count as jest.Mock).mockResolvedValue(142);

    await expect(service.update(1, { periode: '2026-Q2' }, opdUser(5))).rejects.toThrow(
      /142 jawaban/,
    );
  });

  it('mengirim periode yang SAMA persis bukan perubahan, jadi tidak ditolak', async () => {
    // Formulir mengirim seluruh medannya sekaligus. Tanpa perbandingan nilai,
    // menyunting judul saja akan ikut gagal hanya karena periodenya ikut
    // terkirim apa adanya.
    (prisma.survey.findFirst as jest.Mock).mockResolvedValue(
      surveyRow({ status: SurveyStatus.aktif, periode: '2026-Q1' }),
    );
    (prisma.surveyResponse.count as jest.Mock).mockResolvedValue(142);
    (prisma.survey.update as jest.Mock).mockResolvedValue(surveyRow({ judul: 'X' }));

    await expect(
      service.update(1, { judul: 'X', periode: '2026-Q1' }, opdUser(5)),
    ).resolves.toBeDefined();
  });

  it('updateStatus draft → aktif berhasil', async () => {
    (prisma.survey.findFirst as jest.Mock).mockResolvedValue(
      surveyRow({ status: SurveyStatus.draft }),
    );
    (prisma.survey.update as jest.Mock).mockResolvedValue(
      surveyRow({ status: SurveyStatus.aktif }),
    );
    const result = await service.updateStatus(1, { status: SurveyStatus.aktif }, opdUser(5));
    expect(result.status).toBe(SurveyStatus.aktif);
  });

  // Tes ini SEBELUMNYA menuntut `ditutup → aktif` DITOLAK, dan sejak itu selalu
  // merah -- satu-satunya tes merah di seluruh suite unit. Yang usang adalah
  // TESNYA, bukan kodenya: commit 23a189c (18 Agustus 2026) sengaja mengubah
  // ALLOWED_TRANSITIONS dari `[ditutup]: []` menjadi `[ditutup]: [aktif]`
  // dengan komentar "survei dapat dibuka kembali", tetapi berkas ini tak ikut
  // diperbarui. Dibiarkan merah, ia menutupi kegagalan lain yang mungkin muncul
  // belakangan -- justru kebalikan dari gunanya.
  it('updateStatus ditutup → aktif berhasil (survei dapat dibuka kembali)', async () => {
    (prisma.survey.findFirst as jest.Mock).mockResolvedValue(
      surveyRow({ status: SurveyStatus.ditutup }),
    );
    (prisma.survey.update as jest.Mock).mockResolvedValue(
      surveyRow({ status: SurveyStatus.aktif }),
    );

    const result = await service.updateStatus(1, { status: SurveyStatus.aktif }, opdUser(5));

    expect(result.status).toBe(SurveyStatus.aktif);
  });

  // Penjaga arah sebaliknya: membuka kembali BUKAN berarti semua transisi bebas.
  // `aktif → draft` tetap harus ditolak, kalau tidak survei yang sudah menerima
  // jawaban bisa dikembalikan ke draft lalu pertanyaannya disunting.
  it('updateStatus aktif → draft tetap ditolak (BadRequest)', async () => {
    (prisma.survey.findFirst as jest.Mock).mockResolvedValue(
      surveyRow({ status: SurveyStatus.aktif }),
    );

    await expect(
      service.updateStatus(1, { status: SurveyStatus.draft }, opdUser(5)),
    ).rejects.toThrow(BadRequestException);
  });

  it('findOne: Admin OPD akses survei OPD lain → Forbidden', async () => {
    (prisma.survey.findFirst as jest.Mock).mockResolvedValue(surveyRow({ opdId: 99 }));
    await expect(service.findOne(1, opdUser(5))).rejects.toThrow(ForbiddenException);
  });

  it('updateStatus aktif → ditutup memicu snapshot IKM', async () => {
    (prisma.survey.findFirst as jest.Mock).mockResolvedValue(
      surveyRow({ status: SurveyStatus.aktif }),
    );
    (prisma.survey.update as jest.Mock).mockResolvedValue(
      surveyRow({ status: SurveyStatus.ditutup }),
    );
    await service.updateStatus(1, { status: SurveyStatus.ditutup }, opdUser(5));
    expect(ikmService.snapshot).toHaveBeenCalledWith(1);
  });

  it('updateStatus draft → aktif TIDAK memicu snapshot IKM', async () => {
    (prisma.survey.findFirst as jest.Mock).mockResolvedValue(
      surveyRow({ status: SurveyStatus.draft }),
    );
    (prisma.survey.update as jest.Mock).mockResolvedValue(
      surveyRow({ status: SurveyStatus.aktif }),
    );
    await service.updateStatus(1, { status: SurveyStatus.aktif }, opdUser(5));
    expect(ikmService.snapshot).not.toHaveBeenCalled();
  });
  describe('izinkanAnonim', () => {
    beforeEach(() => {
      // assertOpdExists() dipanggil create() -- tanpa mock ini ia menolak
      // BadRequest sebelum sampai ke prisma.survey.create.
      (prisma.opd.findUnique as jest.Mock).mockResolvedValue({ id: 5 });
      (prisma.survey.create as jest.Mock).mockResolvedValue(surveyRow());
    });

    it('create tanpa flag -> tersimpan false (survei lama tak berubah perilakunya)', async () => {
      await service.create({ judul: 'S', periode: '2026-Q1' } as CreateSurveyDto, opdUser(5));

      expect(prisma.survey.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ izinkanAnonim: false }) }),
      );
    });

    it('create dengan flag -> tersimpan true', async () => {
      await service.create(
        { judul: 'S', periode: '2026-Q1', izinkanAnonim: true } as CreateSurveyDto,
        opdUser(5),
      );

      expect(prisma.survey.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ izinkanAnonim: true }) }),
      );
    });

    it('update meneruskan flag; undefined berarti tak diubah', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(surveyRow());
      (prisma.survey.update as jest.Mock).mockResolvedValue(surveyRow({ izinkanAnonim: true }));

      await service.update(1, { izinkanAnonim: true }, opdUser(5));

      expect(prisma.survey.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ izinkanAnonim: true }) }),
      );
    });

    it('duplicate mempertahankan setelan anonim survei asal', async () => {
      // findUnique dipanggil DUA kali (getAccessibleOrThrow, lalu pengambilan
      // beserta questions) -- mockResolvedValue, bukan ...Once.
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(
        surveyRow({ izinkanAnonim: true, questions: [] }),
      );

      await service.duplicate(1, opdUser(5));

      expect(prisma.survey.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ izinkanAnonim: true }) }),
      );
    });

    it('entity membawa izinkanAnonim ke antarmuka', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(surveyRow({ izinkanAnonim: true }));

      const hasil = await service.findOne(1, opdUser(5));

      expect(hasil.izinkanAnonim).toBe(true);
    });
  });

  /**
   * JENIS SURVEI DAN KERANGKA 9 UNSUR (8 Oktober 2026). Survei SKM PermenPANRB
   * lahir bersama sembilan pertanyaan unsurnya dan hanya boleh diaktifkan bila
   * kesembilannya lengkap; survei custom tidak berkerangka.
   */
  describe('jenis survei', () => {
    const kodeLengkap = ['U1', 'U2', 'U3', 'U4', 'U5', 'U6', 'U7', 'U8', 'U9'];
    const unsur = (kode: string[]) => kode.map((kodeUnsur) => ({ kodeUnsur }));

    beforeEach(() => {
      (prisma.opd.findUnique as jest.Mock).mockResolvedValue({ id: 5 });
      (prisma.survey.create as jest.Mock).mockResolvedValue(surveyRow());
    });

    it('create SKM menyimpan jenis dan membuat 9 pertanyaan unsur dalam penulisan yang sama', async () => {
      await service.create(
        { judul: 'S', periode: '2026-Q1', jenis: JenisSurvei.skm_permenpanrb },
        opdUser(5),
      );

      const { data } = (prisma.survey.create as jest.Mock).mock.calls[0][0];
      expect(data.jenis).toBe(JenisSurvei.skm_permenpanrb);
      expect(data.questions.create).toHaveLength(9);
      expect(data.questions.create.map((q: { kodeUnsur: string }) => q.kodeUnsur)).toEqual(
        kodeLengkap,
      );
      expect(
        data.questions.create.every(
          (q: { isIkmUnsur: boolean; tipe: QuestionType }) =>
            q.isIkmUnsur === true && q.tipe === QuestionType.skala,
        ),
      ).toBe(true);
    });

    it('create custom menyimpan jenis tanpa membuat pertanyaan apa pun', async () => {
      await service.create(
        {
          judul: 'S',
          periode: '2026-Q1',
          jenis: JenisSurvei.custom,
          tujuan: TujuanSurvei.kepuasan,
          metodeNilai: MetodeNilai.rata_rata,
        },
        opdUser(5),
      );

      const { data } = (prisma.survey.create as jest.Mock).mock.calls[0][0];
      expect(data.jenis).toBe(JenisSurvei.custom);
      expect(data.questions).toBeUndefined();
    });

    it('duplicate menyalin jenis dan kalimat pertanyaan hasil ubahan OPD', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(
        surveyRow({
          jenis: JenisSurvei.skm_permenpanrb,
          questions: [
            {
              teks: 'Seberapa mudah persyaratan layanan kami?',
              tipe: QuestionType.skala,
              isIkmUnsur: true,
              kodeUnsur: 'U1',
              urutan: 1,
            },
          ],
        }),
      );

      await service.duplicate(1, opdUser(5));

      const { data } = (prisma.survey.create as jest.Mock).mock.calls[0][0];
      expect(data.jenis).toBe(JenisSurvei.skm_permenpanrb);
      expect(data.questions.create[0]).toEqual(
        expect.objectContaining({
          teks: 'Seberapa mudah persyaratan layanan kami?',
          kodeUnsur: 'U1',
        }),
      );
    });

    describe('duplicate melengkapi kerangka', () => {
      const unsurRow = (kodeUnsur: string, urutan: number) => ({
        teks: `Kalimat ${kodeUnsur}`,
        tipe: QuestionType.skala,
        isIkmUnsur: true,
        kodeUnsur,
        urutan,
      });

      const salin = async (jenis: JenisSurvei, questions: unknown[]) => {
        (prisma.survey.findFirst as jest.Mock).mockResolvedValue(surveyRow({ jenis, questions }));
        await service.duplicate(1, opdUser(5));
        return (prisma.survey.create as jest.Mock).mock.calls[0][0].data.questions.create as Array<{
          kodeUnsur: string | null;
          teks: string;
          urutan: number;
        }>;
      };

      it('SKM kehilangan U3: salinan memuat U3 baru di akhir, kalimat lain tidak berubah', async () => {
        const asal = kodeLengkap.filter((k) => k !== 'U3').map((k, i) => unsurRow(k, i + 1));

        const hasil = await salin(JenisSurvei.skm_permenpanrb, asal);

        expect(hasil).toHaveLength(9);
        const u3 = hasil.find((q) => q.kodeUnsur === 'U3');
        expect(u3).toEqual(
          expect.objectContaining({ teks: 'Waktu Penyelesaian', isIkmUnsur: true, urutan: 9 }),
        );
        expect(hasil.find((q) => q.kodeUnsur === 'U1')?.teks).toBe('Kalimat U1');
      });

      it('SKM lengkap: salinan tidak menambah apa pun', async () => {
        const asal = kodeLengkap.map((k, i) => unsurRow(k, i + 1));

        const hasil = await salin(JenisSurvei.skm_permenpanrb, asal);

        expect(hasil).toHaveLength(9);
      });

      it('survei custom tanpa unsur: salinan tidak ditambah unsur', async () => {
        const hasil = await salin(JenisSurvei.custom, []);

        expect(hasil).toHaveLength(0);
      });
    });

    describe('aktivasi menuntut kerangka lengkap', () => {
      const surveiSkm = (status: SurveyStatus) =>
        surveyRow({ status, jenis: JenisSurvei.skm_permenpanrb });

      beforeEach(() => {
        (prisma.survey.update as jest.Mock).mockResolvedValue(
          surveyRow({ status: SurveyStatus.aktif }),
        );
      });

      it('SKM kehilangan U9: draft → aktif ditolak dan pesannya menyebut U9', async () => {
        (prisma.survey.findFirst as jest.Mock).mockResolvedValue(surveiSkm(SurveyStatus.draft));
        (prisma.question.findMany as jest.Mock).mockResolvedValue(unsur(kodeLengkap.slice(0, 8)));

        const aksi = service.updateStatus(1, { status: SurveyStatus.aktif }, opdUser(5));

        await expect(aksi).rejects.toThrow(BadRequestException);
        await expect(aksi).rejects.toThrow(/U9/);
        expect(prisma.survey.update).not.toHaveBeenCalled();
      });

      it('SKM kehilangan U3: ditutup → aktif (dibuka kembali) ditolak dan menyebut U3', async () => {
        (prisma.survey.findFirst as jest.Mock).mockResolvedValue(surveiSkm(SurveyStatus.ditutup));
        (prisma.question.findMany as jest.Mock).mockResolvedValue(
          unsur(kodeLengkap.filter((k) => k !== 'U3')),
        );

        await expect(
          service.updateStatus(1, { status: SurveyStatus.aktif }, opdUser(5)),
        ).rejects.toThrow(/U3/);
      });

      it('SKM lengkap: draft → aktif lolos', async () => {
        (prisma.survey.findFirst as jest.Mock).mockResolvedValue(surveiSkm(SurveyStatus.draft));
        (prisma.question.findMany as jest.Mock).mockResolvedValue(unsur(kodeLengkap));

        const hasil = await service.updateStatus(1, { status: SurveyStatus.aktif }, opdUser(5));

        expect(hasil.status).toBe(SurveyStatus.aktif);
        expect(prisma.question.findMany).toHaveBeenCalledWith(
          expect.objectContaining({ where: { surveyId: 1 } }),
        );
      });

      it('survei custom tanpa unsur: draft → aktif lolos tanpa memeriksa kerangka', async () => {
        (prisma.survey.findFirst as jest.Mock).mockResolvedValue(
          surveyRow({ status: SurveyStatus.draft, jenis: JenisSurvei.custom }),
        );

        const hasil = await service.updateStatus(1, { status: SurveyStatus.aktif }, opdUser(5));

        expect(hasil.status).toBe(SurveyStatus.aktif);
        expect(prisma.question.findMany).not.toHaveBeenCalled();
      });

      it('SKM tak lengkap tetap boleh ditutup (aktif → ditutup tidak memeriksa kerangka)', async () => {
        (prisma.survey.findFirst as jest.Mock).mockResolvedValue(surveiSkm(SurveyStatus.aktif));
        (prisma.survey.update as jest.Mock).mockResolvedValue(
          surveyRow({ status: SurveyStatus.ditutup }),
        );

        await service.updateStatus(1, { status: SurveyStatus.ditutup }, opdUser(5));

        expect(prisma.question.findMany).not.toHaveBeenCalled();
        expect(ikmService.snapshot).toHaveBeenCalledWith(1);
      });
    });
  });

  /**
   * NILAI SURVEI (8 Oktober 2026): survei custom punya tujuan dan metode nilai.
   * Aturan lintas-bidang diuji tersendiri di pengaturan-nilai.util.spec; di sini
   * yang dibuktikan adalah penyambungannya ke service.
   */
  describe('tujuan dan metode nilai', () => {
    beforeEach(() => {
      (prisma.opd.findUnique as jest.Mock).mockResolvedValue({ id: 5 });
      (prisma.survey.create as jest.Mock).mockResolvedValue(surveyRow());
    });

    it('create custom meneruskan tujuan dan metodeNilai ke penulisan', async () => {
      await service.create(
        {
          judul: 'S',
          periode: '2026-Q1',
          jenis: JenisSurvei.custom,
          tujuan: TujuanSurvei.evaluasi,
          metodeNilai: MetodeNilai.indeks_persen,
        },
        opdUser(5),
      );

      const { data } = (prisma.survey.create as jest.Mock).mock.calls[0][0];
      expect(data.tujuan).toBe(TujuanSurvei.evaluasi);
      expect(data.metodeNilai).toBe(MetodeNilai.indeks_persen);
    });

    it('create custom tanpa tujuan atau metode: ditolak SEBELUM menulis apa pun', async () => {
      await expect(
        service.create({ judul: 'S', periode: '2026-Q1', jenis: JenisSurvei.custom }, opdUser(5)),
      ).rejects.toThrow('Tujuan dan metode nilai wajib dipilih untuk survei custom');
      expect(prisma.survey.create).not.toHaveBeenCalled();
    });

    it('create SKM dengan tujuan: ditolak SEBELUM menulis apa pun', async () => {
      await expect(
        service.create(
          {
            judul: 'S',
            periode: '2026-Q1',
            jenis: JenisSurvei.skm_permenpanrb,
            tujuan: TujuanSurvei.kepuasan,
          },
          opdUser(5),
        ),
      ).rejects.toThrow('Survei SKM tidak memakai tujuan dan metode nilai');
      expect(prisma.survey.create).not.toHaveBeenCalled();
    });

    it('create SKM tidak menyimpan tujuan maupun metode', async () => {
      await service.create(
        { judul: 'S', periode: '2026-Q1', jenis: JenisSurvei.skm_permenpanrb },
        opdUser(5),
      );

      const { data } = (prisma.survey.create as jest.Mock).mock.calls[0][0];
      expect(data.tujuan).toBeUndefined();
      expect(data.metodeNilai).toBeUndefined();
    });

    it('update custom meneruskan metodeNilai; undefined berarti tidak diubah', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(
        surveyRow({ status: SurveyStatus.aktif }),
      );
      (prisma.survey.update as jest.Mock).mockResolvedValue(surveyRow());

      await service.update(1, { metodeNilai: MetodeNilai.indeks_persen }, opdUser(5));

      const { data } = (prisma.survey.update as jest.Mock).mock.calls[0][0];
      expect(data.metodeNilai).toBe(MetodeNilai.indeks_persen);
      expect(data.tujuan).toBeUndefined();
    });

    it('update custom yang sudah dijawab: BOLEH (hanya tampilan yang berubah)', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(
        surveyRow({ status: SurveyStatus.aktif }),
      );
      (prisma.surveyResponse.count as jest.Mock).mockResolvedValue(142);
      (prisma.survey.update as jest.Mock).mockResolvedValue(surveyRow());

      await expect(
        service.update(1, { tujuan: TujuanSurvei.penilaian }, opdUser(5)),
      ).resolves.toBeDefined();
    });

    it('update custom pada survei DITUTUP: ditolak', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(
        surveyRow({ status: SurveyStatus.ditutup }),
      );

      await expect(
        service.update(1, { metodeNilai: MetodeNilai.rata_rata }, opdUser(5)),
      ).rejects.toThrow(BadRequestException);
    });

    it('update survei SKM dengan metodeNilai: ditolak', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(
        surveyRow({ jenis: JenisSurvei.skm_permenpanrb }),
      );

      await expect(
        service.update(1, { metodeNilai: MetodeNilai.rata_rata }, opdUser(5)),
      ).rejects.toThrow('Survei SKM tidak memakai tujuan dan metode nilai');
      expect(prisma.survey.update).not.toHaveBeenCalled();
    });

    it('duplicate menyalin tujuan dan metodeNilai', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(
        surveyRow({
          tujuan: TujuanSurvei.evaluasi,
          metodeNilai: MetodeNilai.indeks_persen,
          questions: [],
        }),
      );

      await service.duplicate(1, opdUser(5));

      const { data } = (prisma.survey.create as jest.Mock).mock.calls[0][0];
      expect(data.tujuan).toBe(TujuanSurvei.evaluasi);
      expect(data.metodeNilai).toBe(MetodeNilai.indeks_persen);
    });

    it('duplicate survei SKM tidak membawa tujuan maupun metode (CHECK basis data)', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(
        surveyRow({
          jenis: JenisSurvei.skm_permenpanrb,
          tujuan: null,
          metodeNilai: null,
          questions: [],
        }),
      );

      await service.duplicate(1, opdUser(5));

      const { data } = (prisma.survey.create as jest.Mock).mock.calls[0][0];
      expect(data.tujuan).toBeNull();
      expect(data.metodeNilai).toBeNull();
    });

    it('findOne membawa nilaiSurvei dari ringkasan IkmService', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(surveyRow());
      const nilaiSurvei = {
        judul: 'Nilai Survei',
        nilai: 3.4,
        tampilan: '3,40 / 4',
        kategori: 'Sangat Puas',
      };
      (ikmService.getSummary as jest.Mock).mockResolvedValue({
        respondentsCount: 3,
        nilaiIkm: null,
        nilaiRataRata: 3.4,
        nilaiSurvei,
      });

      const hasil = await service.findOne(1, opdUser(5));

      expect(hasil.nilaiSurvei).toEqual(nilaiSurvei);
    });
  });

  /**
   * SAMPAH SURVEI (11 September 2026). `remove` BERUBAH ARTI: dahulu
   * penghapusan permanen yang hanya boleh saat draf, kini pembuangan ke Sampah
   * untuk semua status. Pemusnahan permanennya pindah ke `purge`.
   */
  describe('remove (buang ke Sampah)', () => {
    it('membuang ke sampah, bukan menghapus barisnya', async () => {
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(surveyRow());

      await service.remove(1, superUser());

      expect(prisma.survey.delete).not.toHaveBeenCalled();
      expect(prisma.survey.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({ deletedAt: expect.any(Date), deletedById: 9 }),
      });
    });

    it('survei AKTIF ditutup lebih dulu, beserta snapshot IKM-nya', async () => {
      // Tautan & QR yang sudah tersebar harus berhenti menerima jawaban pada
      // saat yang sama surveinya masuk sampah. Menutupnya juga menerbitkan
      // snapshot IKM final, supaya angka yang sudah terkumpul tidak hilang
      // begitu saja bila kelak surveinya dimusnahkan.
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(
        surveyRow({ status: SurveyStatus.aktif }),
      );

      await service.remove(1, superUser());

      expect(prisma.survey.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({ status: SurveyStatus.ditutup }),
      });
      expect(ikmService.snapshot).toHaveBeenCalledWith(1);
    });

    it('survei DRAF tidak diubah statusnya & tidak memicu snapshot', async () => {
      // KONTROL. Draf tak pernah bisa diisi, jadi menutupnya hanya membuat
      // riwayat status yang tak pernah terjadi, dan snapshot-nya akan kosong.
      (prisma.survey.findFirst as jest.Mock).mockResolvedValue(surveyRow());

      await service.remove(1, superUser());

      expect(prisma.survey.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.not.objectContaining({ status: expect.anything() }),
      });
      expect(ikmService.snapshot).not.toHaveBeenCalled();
    });
  });
});
