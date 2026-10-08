import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { JenisSurvei, Prisma, Role, Survey, SurveyStatus } from '@prisma/client';
import { assertOpdAccess, opdWhereFilter } from '../../common/auth/opd-scope.util';
import type { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginatedResult, paginate } from '../../common/dto/paginated-result';
import { PrismaService } from '../../prisma/prisma.service';
import { IkmService } from '../ikm/ikm.service';
import { CreateSurveyDto } from './dto/create-survey.dto';
import { ListActiveSurveyQueryDto } from './dto/list-active-survey-query.dto';
import { ListSurveyQueryDto } from './dto/list-survey-query.dto';
import { UpdateSurveyDto } from './dto/update-survey.dto';
import { UpdateSurveyStatusDto } from './dto/update-survey-status.dto';
import { SurveyEntity } from './entities/survey.entity';
import { TrashedSurveyEntity } from './entities/trashed-survey.entity';
import { assertKerangkaLengkap, buatUnsurAwal, unsurHilang } from './kerangka-unsur.util';
import { assertPengaturanNilaiBuat, assertPengaturanNilaiUbah } from './pengaturan-nilai.util';
import { operasiPemusnahanSurvei } from './survey-pemusnahan.util';
import { assertSurveyEditable, TIDAK_DIBUANG } from './survey-scope.util';

/** Transisi status yang diizinkan. */
const ALLOWED_TRANSITIONS: Record<SurveyStatus, SurveyStatus[]> = {
  [SurveyStatus.draft]: [SurveyStatus.aktif, SurveyStatus.ditutup],
  [SurveyStatus.aktif]: [SurveyStatus.ditutup],
  [SurveyStatus.ditutup]: [SurveyStatus.aktif], // survei dapat dibuka kembali
};

@Injectable()
export class SurveysService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ikmService: IkmService,
  ) {}

  /** Daftar survei — Kabupaten semua, Admin OPD hanya milik OPD-nya (data isolation). */
  async findAll(
    query: ListSurveyQueryDto,
    user: CurrentUser,
  ): Promise<PaginatedResult<SurveyEntity>> {
    const { page, limit, status, opdId } = query;
    const where: Prisma.SurveyWhereInput = { ...opdWhereFilter(user), ...TIDAK_DIBUANG };
    if (status) {
      where.status = status;
    }
    if (opdId != null) {
      // AND, BUKAN menimpa `where.opdId`. Kalau ditimpa, akun Admin OPD bisa
      // membaca survei OPD lain hanya dengan menambah parameter -- penyaring
      // kepemilikan harus tetap berlaku, jadi keduanya digabung (hasilnya
      // kosong bila id yang diminta bukan OPD-nya).
      where.AND = [{ opdId }];
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.survey.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.survey.count({ where }),
    ]);

    const summaries = await Promise.all(rows.map((row) => this.ikmService.getSummary(row)));
    const items = rows.map((row, i) => new SurveyEntity({ ...row, ...summaries[i] }));

    return paginate(items, total, page, limit);
  }

  /**
   * Daftar survei berstatus `aktif` (semua OPD) — untuk dipilih responden (BE-21).
   * Sertakan `opdNama` & `questionsCount` (INT-17) — kartu survei responden butuh
   * keduanya untuk ditampilkan (dari OPD mana, berapa pertanyaan).
   */
  async findActive(query: ListActiveSurveyQueryDto): Promise<PaginatedResult<SurveyEntity>> {
    const { page, limit, opdId } = query;
    const where: Prisma.SurveyWhereInput = { status: SurveyStatus.aktif, ...TIDAK_DIBUANG };
    if (opdId) {
      where.opdId = opdId;
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.survey.findMany({
        where,
        include: { opd: { select: { nama: true } }, _count: { select: { questions: true } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.survey.count({ where }),
    ]);

    const items = rows.map((row) => {
      const { opd, _count, ...rest } = row;
      return new SurveyEntity({ ...rest, opdNama: opd.nama, questionsCount: _count.questions });
    });

    return paginate(items, total, page, limit);
  }

  async findOne(id: number, user: CurrentUser): Promise<SurveyEntity> {
    const survey = await this.getAccessibleOrThrow(id, user);
    // `respondentsCount` ikut dikirim sejak 11 September 2026 (sebelumnya hanya
    // GET /surveys yang mengisinya). Builder survei memakainya untuk mengunci
    // susunan pertanyaan; tanpa angka ini ia selalu membaca 0 dan penguncian
    // tak pernah menyala -- pengguna baru tahu aturannya dari galat backend.
    // `terakhirMasuk` ikut sejak 4 Oktober 2026, untuk kartu ringkasan pada
    // layar daftar respons yang kini dipaginasi sungguhan. Sebelum paginasi,
    // layar itu menghitungnya sendiri dari 100 baris yang kebetulan termuat;
    // sesudahnya, halaman 1 yang menaik justru akan melaporkan respons PALING
    // LAMA sebagai "terakhir". Satu agregat kecil di sini menjawabnya untuk
    // seluruh survei, berapa pun halamannya.
    const [summary, agregat] = await Promise.all([
      this.ikmService.getSummary(survey),
      this.prisma.surveyResponse.aggregate({
        where: { surveyId: id },
        _max: { submittedAt: true },
      }),
    ]);
    return new SurveyEntity({
      ...survey,
      ...summary,
      terakhirMasuk: agregat._max.submittedAt ?? null,
    });
  }

  /** Buat paket survei. Admin OPD → OPD-nya sendiri; kabupaten (=superuser) → wajib `opdId`. */
  async create(dto: CreateSurveyDto, user: CurrentUser): Promise<SurveyEntity> {
    const opdId = this.resolveOpdId(dto, user);
    await this.assertOpdExists(opdId);
    // Sebelum menulis apa pun: custom wajib memilih tujuan + metode, SKM tidak boleh.
    assertPengaturanNilaiBuat(dto.jenis, dto.tujuan, dto.metodeNilai);

    const created = await this.prisma.survey.create({
      data: {
        opdId,
        judul: dto.judul,
        periode: dto.periode,
        jenis: dto.jenis,
        tujuan: dto.tujuan,
        metodeNilai: dto.metodeNilai,
        allowMultipleSubmit: dto.allowMultipleSubmit ?? false,
        izinkanAnonim: dto.izinkanAnonim ?? false,
        // Survei SKM lahir bersama kesembilan unsurnya, dalam penulisan yang
        // sama (nested create atomik): tak pernah ada survei SKM tanpa kerangka.
        ...(dto.jenis === JenisSurvei.skm_permenpanrb
          ? { questions: { create: buatUnsurAwal() } }
          : {}),
      },
    });
    return new SurveyEntity(created);
  }

  /** Ubah survei — hanya saat status `draft`. */
  async update(id: number, dto: UpdateSurveyDto, user: CurrentUser): Promise<SurveyEntity> {
    const survey = await this.getAccessibleOrThrow(id, user);
    const jumlahJawaban = await this.prisma.surveyResponse.count({ where: { surveyId: id } });

    // Periode diperiksa TERPISAH, dan hanya bila benar-benar berganti nilai:
    // mengirim periode yang sama persis bukan perubahan, dan menolaknya akan
    // membuat penyuntingan judul ikut gagal hanya karena formulir mengirim
    // seluruh medannya.
    const periodeBerganti = dto.periode !== undefined && dto.periode !== survey.periode;
    assertSurveyEditable(survey, jumlahJawaban, periodeBerganti ? 'periode' : 'meta');
    // Tujuan + metode hanya mengatur TAMPILAN (aksi `meta`: boleh sampai survei
    // ditutup, juga sesudah jawaban masuk); survei SKM tidak memakainya.
    assertPengaturanNilaiUbah(survey.jenis, dto.tujuan, dto.metodeNilai);

    // Satu transaksi, dan URUTANNYA mengikat: survei utama OPD yang lama harus
    // dilepas SEBELUM yang baru dinyalakan. Indeks unik parsial
    // `surveys_opd_utama_unik` diperiksa PostgreSQL per pernyataan, bukan
    // ditunda sampai commit, jadi menyalakan lebih dulu akan ditolak oleh
    // barisnya sendiri yang belum sempat dilepas.
    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.isUtama === true) {
        await tx.survey.updateMany({
          where: { opdId: survey.opdId, isUtama: true, id: { not: id }, deletedAt: null },
          data: { isUtama: false },
        });
      }

      return tx.survey.update({
        where: { id },
        data: {
          judul: dto.judul,
          periode: dto.periode,
          allowMultipleSubmit: dto.allowMultipleSubmit,
          // undefined = tak diubah (pola sama allowMultipleSubmit di atas).
          izinkanAnonim: dto.izinkanAnonim,
          isUtama: dto.isUtama,
          // undefined = tak diubah.
          tujuan: dto.tujuan,
          metodeNilai: dto.metodeNilai,
        },
      });
    });
    return new SurveyEntity(updated);
  }

  /** Isi Sampah — Kabupaten semua OPD, Admin OPD hanya miliknya. */
  async findTrashed(
    query: ListSurveyQueryDto,
    user: CurrentUser,
  ): Promise<PaginatedResult<TrashedSurveyEntity>> {
    const { page, limit } = query;
    const where: Prisma.SurveyWhereInput = {
      ...opdWhereFilter(user),
      deletedAt: { not: null },
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.survey.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { deletedAt: 'desc' },
        include: {
          opd: { select: { nama: true } },
          deletedBy: { select: { nama: true } },
          _count: { select: { responses: true } },
        },
      }),
      this.prisma.survey.count({ where }),
    ]);

    const items = rows.map(
      (row) =>
        new TrashedSurveyEntity({
          id: row.id,
          judul: row.judul,
          periode: row.periode,
          status: row.status,
          opdId: row.opdId,
          opdNama: row.opd.nama,
          deletedAt: row.deletedAt as Date,
          deletedByNama: row.deletedBy?.nama ?? null,
          jumlahJawaban: row._count.responses,
        }),
    );

    return paginate(items, total, page, limit);
  }

  /**
   * Buang survei ke Sampah (11 September 2026). BUKAN lagi penghapusan
   * permanen: barisnya tetap ada dengan `deletedAt` terisi, dan pemusnahannya
   * punya rutenya sendiri (`purge`) yang hanya dapat dijalankan dari Sampah.
   *
   * SELURUH STATUS boleh dibuang, atas keputusan pengguna. Survei `aktif`
   * ditutup lebih dulu supaya tautan & QR yang sudah tersebar berhenti
   * menerima jawaban pada saat yang sama ia masuk sampah; penutupan itu
   * sekaligus menerbitkan snapshot IKM final lewat jalur yang sudah ada.
   */
  async remove(id: number, user: CurrentUser): Promise<void> {
    const survey = await this.getAccessibleOrThrow(id, user);
    const perluDitutup = survey.status === SurveyStatus.aktif;

    await this.prisma.survey.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedById: user.userId,
        ...(perluDitutup ? { status: SurveyStatus.ditutup } : {}),
      },
    });

    if (perluDitutup) {
      // SESUDAH baris diperbarui: snapshot menghitung dari jawaban yang sudah
      // masuk, dan tak ada yang dapat menambahnya lagi setelah statusnya
      // ditutup. Urutan sebaliknya membuka celah satu jawaban terakhir yang
      // tak ikut terhitung.
      await this.ikmService.snapshot(id);
    }
  }

  /**
   * Pulihkan survei dari Sampah. Statusnya TIDAK disentuh: survei yang dibuang
   * dalam keadaan aktif sudah ditutup saat dibuang, dan membukanya kembali
   * adalah keputusan tersendiri yang sudah punya tombolnya sendiri
   * (`PATCH /surveys/:id/status`). Memulihkan sekaligus mengaktifkan berarti
   * diam-diam membuka survei untuk diisi lagi.
   */
  async restore(id: number, user: CurrentUser): Promise<SurveyEntity> {
    const survey = await this.getTrashedOrThrow(id, user);
    const updated = await this.prisma.survey.update({
      where: { id: survey.id },
      data: { deletedAt: null, deletedById: null },
    });
    return new SurveyEntity(updated);
  }

  /**
   * Musnahkan permanen. Hanya dari Sampah; penjaga perannya ada di `@Roles`
   * controller, dan kurungan per-OPD-nya di `getTrashedOrThrow`.
   *
   * Rangkaian penghapusannya ada di `operasiPemusnahanSurvei`, dipakai bersama
   * pemusnahan terjadwal. Alasan lengkapnya -- termasuk mengapa urutan daun ke
   * akar itu wajib -- tertulis di berkas util tersebut.
   */
  async purge(id: number, user: CurrentUser): Promise<void> {
    const survey = await this.getTrashedOrThrow(id, user);

    await this.prisma.$transaction(operasiPemusnahanSurvei(this.prisma, survey.id));
  }

  /** Publikasikan / tutup survei (transisi tervalidasi). */
  async updateStatus(
    id: number,
    dto: UpdateSurveyStatusDto,
    user: CurrentUser,
  ): Promise<SurveyEntity> {
    const survey = await this.getAccessibleOrThrow(id, user);

    if (survey.status === dto.status) {
      return new SurveyEntity(survey);
    }
    if (!ALLOWED_TRANSITIONS[survey.status].includes(dto.status)) {
      throw new BadRequestException(
        `Transisi status ${survey.status} → ${dto.status} tidak diizinkan`,
      );
    }

    if (dto.status === SurveyStatus.aktif && survey.jenis === JenisSurvei.skm_permenpanrb) {
      // Berlaku juga saat survei DIBUKA KEMBALI: survei SKM yang unsurnya sudah
      // tak lengkap tak boleh menerima jawaban baru, karena IKM-nya dihitung
      // dengan bobot yang keliru. Menutup tidak diperiksa -- hasil yang ada
      // tetap harus dapat dikunci.
      const pertanyaan = await this.prisma.question.findMany({
        where: { surveyId: id },
        select: { kodeUnsur: true },
      });
      assertKerangkaLengkap(
        survey,
        pertanyaan.map((q) => q.kodeUnsur),
      );
    }

    const updated = await this.prisma.survey.update({
      where: { id },
      data: { status: dto.status },
    });

    if (dto.status === SurveyStatus.ditutup) {
      // Snapshot hasil IKM final saat survei ditutup — sumber rumus tunggal di IkmService.
      await this.ikmService.snapshot(id);
    }

    return new SurveyEntity(updated);
  }

  /** Duplikasi survei (beserta pertanyaannya) sebagai draft baru. */
  async duplicate(id: number, user: CurrentUser): Promise<SurveyEntity> {
    await this.getAccessibleOrThrow(id, user);
    const original = await this.prisma.survey.findFirst({
      where: { id, ...TIDAK_DIBUANG },
      include: { questions: true },
    });
    if (!original) {
      throw new NotFoundException(`Survei dengan id ${id} tidak ditemukan`);
    }

    const created = await this.prisma.survey.create({
      data: {
        opdId: original.opdId,
        judul: `${original.judul} (Salinan)`,
        periode: original.periode,
        jenis: original.jenis,
        tujuan: original.tujuan,
        metodeNilai: original.metodeNilai,
        allowMultipleSubmit: original.allowMultipleSubmit,
        izinkanAnonim: original.izinkanAnonim,
        status: SurveyStatus.draft,
        questions: {
          create: [
            ...original.questions.map((q) => ({
              teks: q.teks,
              tipe: q.tipe,
              isIkmUnsur: q.isIkmUnsur,
              kodeUnsur: q.kodeUnsur,
              urutan: q.urutan,
            })),
            ...this.unsurPelengkap(original),
          ],
        },
      },
    });
    return new SurveyEntity(created);
  }

  /**
   * Unsur yang hilang dari survei SKM lama, dibuat ulang pada salinannya (8
   * Oktober 2026). Survei SKM yang unsurnya tak lengkap tak dapat diaktifkan dan
   * tak punya jalan memperbaikinya (pertanyaan ber-kodeUnsur selalu ditolak),
   * sehingga menggandakan adalah satu-satunya jalan pulih. Diletakkan di akhir
   * dengan kalimat awal berupa nama unsur; kalimat yang sudah ada tidak diubah.
   */
  private unsurPelengkap(
    original: Survey & { questions: { kodeUnsur: string | null; urutan: number }[] },
  ) {
    if (original.jenis !== JenisSurvei.skm_permenpanrb) {
      return [];
    }
    const hilang = unsurHilang(original.questions.map((q) => q.kodeUnsur));
    if (hilang.length === 0) {
      return [];
    }
    const urutanTerakhir = original.questions.reduce((maks, q) => Math.max(maks, q.urutan), 0);
    return buatUnsurAwal()
      .filter((unsur) => hilang.includes(unsur.kodeUnsur))
      .map((unsur, i) => ({ ...unsur, urutan: urutanTerakhir + 1 + i }));
  }

  private resolveOpdId(dto: CreateSurveyDto, user: CurrentUser): number {
    if (user.actingRole === Role.opd) {
      if (user.opdId == null) {
        throw new BadRequestException('Akun OPD tidak tertaut ke OPD mana pun');
      }
      return user.opdId; // Admin OPD selalu membuat untuk OPD-nya sendiri
    }
    // kabupaten & superuser (terdaftar di @Roles sejak T6) atau lainnya
    if (dto.opdId == null) {
      throw new BadRequestException('opdId wajib diisi');
    }
    return dto.opdId;
  }

  private async assertOpdExists(opdId: number): Promise<void> {
    const opd = await this.prisma.opd.findUnique({ where: { id: opdId } });
    if (!opd) {
      throw new BadRequestException(`OPD dengan id ${opdId} tidak ditemukan`);
    }
  }

  /**
   * Survei yang ADA DI SAMPAH dan boleh disentuh pengguna ini. Dipakai
   * `restore` maupun `purge` -- keduanya hanya sah atas baris terbuang, dan
   * membedakan "tak ada" dari "tidak di sampah" membantu pemanggilnya
   * memperbaiki keadaan.
   */
  private async getTrashedOrThrow(id: number, user: CurrentUser): Promise<Survey> {
    const survey = await this.prisma.survey.findUnique({ where: { id } });
    if (!survey) {
      throw new NotFoundException(`Survei dengan id ${id} tidak ditemukan`);
    }
    assertOpdAccess(user, survey.opdId);
    if (survey.deletedAt === null) {
      throw new BadRequestException('Survei ini tidak berada di Sampah');
    }
    return survey;
  }

  private async getAccessibleOrThrow(id: number, user: CurrentUser): Promise<Survey> {
    const survey = await this.prisma.survey.findFirst({ where: { id, ...TIDAK_DIBUANG } });
    if (!survey) {
      throw new NotFoundException(`Survei dengan id ${id} tidak ditemukan`);
    }
    assertOpdAccess(user, survey.opdId); // Admin OPD hanya OPD-nya; kabupaten (=superuser) semua
    return survey;
  }
}
