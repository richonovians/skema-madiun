import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Question, QuestionOption, QuestionType, SurveyStatus } from '@prisma/client';
import { assertOpdAccess } from '../../common/auth/opd-scope.util';
import type { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginatedResult, paginate } from '../../common/dto/paginated-result';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { ConsentService } from '../auth/consent.service';
import { QuestionOptionEntity } from '../questions/entities/question-option.entity';
import { QuestionEntity } from '../questions/entities/question.entity';
import { SubmitPublicResponseDto } from './dto/submit-public-response.dto';
import { SubmitResponseDto } from './dto/submit-response.dto';
import { AnswerEntity } from './entities/answer.entity';
import { MyResponseEntity } from './entities/my-response.entity';
import { ResponseEntity } from './entities/response.entity';
import { SurveyFillEntity } from './entities/survey-fill.entity';
import { TIDAK_DIBUANG } from '../surveys/survey-scope.util';

@Injectable()
export class ResponsesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly consent: ConsentService,
  ) {}

  /** Ambil survei aktif beserta pertanyaannya untuk diisi responden (BE-22). */
  async getFill(surveyId: number, user: CurrentUser): Promise<SurveyFillEntity> {
    const survey = await this.prisma.survey.findFirst({
      where: { id: surveyId, ...TIDAK_DIBUANG },
      include: {
        questions: {
          orderBy: { urutan: 'asc' },
          include: { options: { orderBy: { urutan: 'asc' } } },
        },
      },
    });
    // Survei non-aktif tidak boleh diisi; jangan bocorkan keberadaannya → NotFound.
    if (!survey || survey.status !== SurveyStatus.aktif) {
      throw new NotFoundException(`Survei aktif dengan id ${surveyId} tidak ditemukan`);
    }

    const sudahMengisi = survey.allowMultipleSubmit
      ? false
      : (await this.prisma.surveyResponse.findFirst({
          where: { surveyId, dedupeUserId: user.userId },
          select: { id: true },
        })) !== null;

    return new SurveyFillEntity({
      id: survey.id,
      judul: survey.judul,
      periode: survey.periode,
      status: survey.status,
      allowMultipleSubmit: survey.allowMultipleSubmit,
      sudahMengisi,
      questions: survey.questions.map(
        (q) =>
          new QuestionEntity({
            ...q,
            options: q.options.map((o) => new QuestionOptionEntity(o)),
          }),
      ),
    });
  }

  /** Kirim jawaban survei (BE-23). Validasi kelengkapan + anti-duplikat (409). */
  async submit(
    surveyId: number,
    dto: SubmitResponseDto,
    user: CurrentUser,
  ): Promise<ResponseEntity> {
    // PALING AWAL, sebelum satu kueri pun (celah 2, 2026-08-27). Mengirim
    // jawaban survei adalah pengumpulan data pribadi, jadi tanpa persetujuan
    // PDP permintaan ini ditolak — dan ditolak di sini supaya pesan galatnya
    // soal persetujuan, bukan soal survei yang tak ditemukan.
    await this.consent.assertConsented(user);

    const survey = await this.prisma.survey.findFirst({
      where: { id: surveyId, ...TIDAK_DIBUANG },
      include: { questions: { include: { options: true } } },
    });
    if (!survey || survey.status !== SurveyStatus.aktif) {
      throw new NotFoundException(`Survei aktif dengan id ${surveyId} tidak ditemukan`);
    }

    const answerData = this.validateAnswers(survey.questions, dto);

    // Anti-duplikat: kolom diisi userId saat single-submit (null saat multi).
    // @@unique([surveyId, dedupeUserId]) + NULLS DISTINCT Postgres menegakkan aturannya.
    const dedupeUserId = survey.allowMultipleSubmit ? null : user.userId;
    if (dedupeUserId !== null) {
      const existing = await this.prisma.surveyResponse.findFirst({
        where: { surveyId, dedupeUserId },
        select: { id: true },
      });
      if (existing) {
        throw new ConflictException('Anda sudah mengisi survei ini');
      }
    }

    // Data diri DISALIN DARI AKUN, tidak diterima dari payload (8 September
    // 2026). Pengisi bersesi hanya memilih ya/tidak pada gerbangnya, jadi
    // isinya tak dapat dikarang lewat permintaan langsung.
    //
    // Diambil SESUDAH pra-cek duplikat, bukan sebelumnya: permintaan yang sudah
    // pasti berakhir 409 tak perlu membayar satu kueri tambahan.
    const dataDiri = dto.tanpaDataDiri ? null : await this.ambilDataDiriAkun(user.userId);

    try {
      const created = await this.prisma.surveyResponse.create({
        data: {
          surveyId,
          userId: user.userId,
          dedupeUserId,
          // `nomorHp` TIDAK disebut di sini, dan ketiadaannya disengaja: tak ada
          // sumbernya untuk pengguna bersesi. Helpdesk tak mengirim nomor
          // telepon dan `users` tak punya kolomnya, jadi menyebutkannya di sini
          // hanya menulis null yang menyamar sebagai data yang dicoba diambil.
          nama: dataDiri?.nama ?? null,
          jenisKelamin: dataDiri?.jenisKelamin ?? null,
          kelompokUmur: dataDiri?.kelompokUmur ?? null,
          answers: { create: answerData },
        },
        include: { answers: true },
      });
      return this.toResponseEntity(created, created.answers);
    } catch (err) {
      // Jaga-jaga balapan (race) menembus pra-cek → langgar unique constraint.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Anda sudah mengisi survei ini');
      }
      throw err;
    }
  }

  /**
   * Survei untuk diisi TANPA sesi (rute /survei/:id).
   *
   * TERPISAH dari `getFill`, bukan pelonggaran atasnya: `getFill` menuntut
   * `CurrentUser` dan memakainya untuk anti-duplikat, sedangkan di sini tak ada
   * pengguna sama sekali. Menyatukan keduanya berarti satu parameter opsional
   * yang menentukan seluruh perilaku keamanan -- persis bentuk kode yang kelak
   * longgar karena kelalaian.
   */
  async getPublicFill(surveyId: number): Promise<SurveyFillEntity> {
    const survey = await this.findAnonimSurveyOrThrow(surveyId);

    return new SurveyFillEntity({
      id: survey.id,
      judul: survey.judul,
      periode: survey.periode,
      status: survey.status,
      allowMultipleSubmit: survey.allowMultipleSubmit,
      // Tanpa sesi, `dedupeUserId` tak punya pegangan apa pun. Penanda
      // pengisian ada di peramban (localStorage) -- penghalang kejujuran,
      // BUKAN penegakan, dan batasnya dinyatakan terus terang di sana.
      sudahMengisi: false,
      questions: survey.questions.map(
        (q) =>
          new QuestionEntity({
            ...q,
            options: q.options.map((o) => new QuestionOptionEntity(o)),
          }),
      ),
    });
  }

  /**
   * Kirim jawaban tanpa sesi. SELALU menulis `userId: null`.
   *
   * `ConsentService.assertConsented` tetap TIDAK dipanggil di jalur ini, dan
   * sebabnya teknis: ia membaca `users.consentAt`, sedangkan pengirim tanpa
   * sesi tak punya baris `users`. Penggantinya kini BERLAKU (8 September 2026,
   * sesudah tim mengonfirmasi bahwa aplikasi ini memang memerlukan persetujuan
   * UU PDP): `setuju: true` wajib pada `SubmitPublicResponseDto`, ditolak 400
   * oleh ValidationPipe sebelum satu baris pun tertulis, dan waktunya direkam
   * per respons di `consentAt`.
   *
   * Penegakannya memang harus di sini, bukan di layar: gerbang di frontend
   * dapat dilewati dengan satu permintaan langsung, jadi tanpa penjaga ini
   * gerbang PDP-nya hanya hiasan. Alasan yang sama sudah tertulis di
   * ConsentGate.jsx bagi jalur yang berpenjaga.
   *
   * `consentAt` diisi waktu SERVER, bukan waktu kiriman klien: waktu
   * persetujuan yang boleh ditentukan pengirim bukan bukti apa pun.
   *
   * Validasi isi jawaban tetap sama ketat: `validateAnswers` yang sama dipakai
   * di sini.
   */
  async submitPublic(surveyId: number, dto: SubmitPublicResponseDto): Promise<ResponseEntity> {
    const survey = await this.findAnonimSurveyOrThrow(surveyId);
    const answerData = this.validateAnswers(survey.questions, dto);

    const created = await this.prisma.surveyResponse.create({
      data: {
        surveyId,
        userId: null,
        dedupeUserId: null,
        consentAt: new Date(),
        // `?? null`, BUKAN dibiarkan undefined: pada `create` Prisma,
        // `undefined` berarti "pakai nilai baku", sedangkan `null` menyatakan
        // tersurat bahwa pengisi memilih tidak memberi datanya. Bedanya yang
        // membedakan "memilih anonim" dari "medannya lupa dikirim".
        //
        // `tanpaDataDiri` DIHORMATI walau pada jalur ini ia berlebihan: gerbang
        // publik sudah menghilangkan medannya saat pengisi memilih anonim.
        // Menghormatinya tetap membuat payload yang mengirim keduanya sekaligus
        // (anonim DAN data diri) berperilaku seperti yang dikatakan pilihannya,
        // bukan seperti yang dikatakan sisa payloadnya.
        nama: dto.tanpaDataDiri ? null : (dto.nama ?? null),
        nomorHp: dto.tanpaDataDiri ? null : (dto.nomorHp ?? null),
        jenisKelamin: dto.tanpaDataDiri ? null : (dto.jenisKelamin ?? null),
        kelompokUmur: dto.tanpaDataDiri ? null : (dto.kelompokUmur ?? null),
        answers: { create: answerData },
      },
      include: { answers: true },
    });
    return this.toResponseEntity(created, created.answers);
  }

  /**
   * Survei aktif YANG MENGIZINKAN anonim, atau 404. Dua syarat, satu tempat --
   * dipakai kedua endpoint publik supaya tak mungkin salah satunya kelewat.
   *
   * 404 (bukan 403) mengikuti `getFill`: keberadaan survei yang tak boleh diisi
   * tak perlu dibocorkan kepada pemanggil tanpa sesi.
   */
  private async findAnonimSurveyOrThrow(surveyId: number) {
    const survey = await this.prisma.survey.findFirst({
      where: { id: surveyId, ...TIDAK_DIBUANG },
      include: {
        questions: {
          orderBy: { urutan: 'asc' },
          include: { options: { orderBy: { urutan: 'asc' } } },
        },
      },
    });
    if (!survey || survey.status !== SurveyStatus.aktif || !survey.izinkanAnonim) {
      throw new NotFoundException(`Survei anonim dengan id ${surveyId} tidak ditemukan`);
    }
    return survey;
  }

  /**
   * Data diri pengguna bersesi, untuk direkam pada respons (8 September 2026).
   *
   * DISALIN, tidak diterima dari payload: gerbang bagi pengguna bersesi hanya
   * menampilkan kotak anonim, sesuai permintaan pengguna, jadi isinya harus
   * berasal dari sumber yang tak dapat dikarang pemanggil.
   *
   * Yang diambil hanya yang BENAR-BENAR ADA, dan batasnya sudah diukur:
   * Helpdesk mengirim `sub`, `email`, `email_verified`, dan `nama` saja, jadi
   * `nama` satu-satunya yang datang dari sana. Demografisnya diambil dari
   * `respondent_profiles`, yang barisnya jarang ada karena belum ada satu pun
   * UI yang menulis tabel itu. Akun tanpa baris itu menghasilkan respons yang
   * demografisnya null, dan itu keadaan normal, bukan galat.
   *
   * Nomor HP tak ada di sini karena tak ada di mana pun: bukan di klaim
   * Helpdesk, bukan di kolom `users`.
   */
  private async ambilDataDiriAkun(userId: number) {
    const akun = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        nama: true,
        respondentProfile: { select: { jenisKelamin: true, kelompokUmur: true } },
      },
    });
    if (!akun) return null;
    return {
      nama: akun.nama,
      jenisKelamin: akun.respondentProfile?.jenisKelamin ?? null,
      kelompokUmur: akun.respondentProfile?.kelompokUmur ?? null,
    };
  }

  /** Daftar respons sebuah survei untuk admin (BE-24). Isolasi data per-OPD. */
  async findAllForSurvey(
    surveyId: number,
    query: PaginationQueryDto,
    user: CurrentUser,
  ): Promise<PaginatedResult<ResponseEntity>> {
    const survey = await this.prisma.survey.findFirst({
      where: { id: surveyId, ...TIDAK_DIBUANG },
    });
    if (!survey) {
      throw new NotFoundException(`Survei dengan id ${surveyId} tidak ditemukan`);
    }
    assertOpdAccess(user, survey.opdId); // Admin OPD hanya OPD-nya; kabupaten (=superuser) semua

    const { page, limit } = query;
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.surveyResponse.findMany({
        where: { surveyId },
        include: { answers: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { submittedAt: 'desc' },
      }),
      this.prisma.surveyResponse.count({ where: { surveyId } }),
    ]);

    return paginate(
      rows.map((r) => this.toResponseEntity(r, r.answers)),
      total,
      page,
      limit,
    );
  }

  /**
   * Riwayat survei yang diisi pengguna yang sedang login (2026-08-24).
   *
   * Disaring `userId`, BUKAN `dedupeUserId`: kolom dedupe sengaja null pada survei
   * ber-`allowMultipleSubmit`, jadi memakainya akan menyembunyikan justru survei
   * yang boleh diisi berulang. `userId` selalu terisi (kolom wajib), sehingga
   * riwayatnya lengkap.
   */
  async findMine(
    query: PaginationQueryDto,
    user: CurrentUser,
  ): Promise<PaginatedResult<MyResponseEntity>> {
    const { page, limit } = query;
    const where: Prisma.SurveyResponseWhereInput = { userId: user.userId };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.surveyResponse.findMany({
        where,
        select: {
          id: true,
          surveyId: true,
          submittedAt: true,
          survey: { select: { judul: true, periode: true, opd: { select: { nama: true } } } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { submittedAt: 'desc' },
      }),
      this.prisma.surveyResponse.count({ where }),
    ]);

    return paginate(
      rows.map(
        (r) =>
          new MyResponseEntity({
            id: r.id,
            surveyId: r.surveyId,
            surveyJudul: r.survey.judul,
            periode: r.survey.periode,
            opdNama: r.survey.opd?.nama ?? null,
            submittedAt: r.submittedAt,
          }),
      ),
      total,
      page,
      limit,
    );
  }

  /**
   * Validasi jawaban terhadap pertanyaan survei; kembalikan data siap-insert.
   * Aturan: pertanyaan skala & pilihan WAJIB dijawab; pertanyaan teks opsional.
   */
  private validateAnswers(
    questions: (Question & { options: QuestionOption[] })[],
    dto: SubmitResponseDto,
  ): Prisma.AnswerCreateWithoutResponseInput[] {
    const byId = new Map(questions.map((q) => [q.id, q]));
    const seen = new Set<number>();
    const data: Prisma.AnswerCreateWithoutResponseInput[] = [];

    for (const a of dto.answers) {
      const q = byId.get(a.questionId);
      if (!q) {
        throw new BadRequestException(
          `Pertanyaan dengan id ${a.questionId} bukan bagian dari survei ini`,
        );
      }
      if (seen.has(a.questionId)) {
        throw new BadRequestException(`Jawaban ganda untuk pertanyaan ${a.questionId}`);
      }
      seen.add(a.questionId);

      if (q.tipe === QuestionType.skala) {
        if (a.nilai == null) {
          throw new BadRequestException(`Pertanyaan ${q.id} (skala) wajib diisi nilai 1-4`);
        }
        data.push({ question: { connect: { id: q.id } }, nilai: a.nilai });
      } else if (q.tipe === QuestionType.teks) {
        data.push({ question: { connect: { id: q.id } }, teks: a.teks ?? null });
      } else if (q.tipe === QuestionType.pilihan) {
        if (a.selectedOptionId == null) {
          throw new BadRequestException(`Pertanyaan ${q.id} (pilihan) wajib memilih satu opsi`);
        }
        if (!q.options.some((o) => o.id === a.selectedOptionId)) {
          throw new BadRequestException(`Opsi ${a.selectedOptionId} bukan opsi pertanyaan ${q.id}`);
        }
        data.push({
          question: { connect: { id: q.id } },
          selectedOption: { connect: { id: a.selectedOptionId } },
        });
      }
    }

    // Kelengkapan: skala (dasar IKM) & pilihan wajib terjawab; teks tetap opsional.
    for (const q of questions) {
      if ((q.tipe === QuestionType.skala || q.tipe === QuestionType.pilihan) && !seen.has(q.id)) {
        throw new BadRequestException(`Pertanyaan ${q.id} wajib dijawab`);
      }
    }

    return data;
  }

  private toResponseEntity(
    row: { id: number; surveyId: number; submittedAt: Date },
    answers: {
      id: number;
      questionId: number;
      nilai: number | null;
      teks: string | null;
      selectedOptionId: number | null;
    }[],
  ): ResponseEntity {
    return new ResponseEntity({
      id: row.id,
      surveyId: row.surveyId,
      submittedAt: row.submittedAt,
      answers: answers.map(
        (a) =>
          new AnswerEntity({
            id: a.id,
            questionId: a.questionId,
            nilai: a.nilai,
            teks: a.teks,
            selectedOptionId: a.selectedOptionId,
          }),
      ),
    });
  }
}
