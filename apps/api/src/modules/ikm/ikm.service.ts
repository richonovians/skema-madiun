import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ComplaintStatus,
  IkmMutu,
  Prisma,
  QuestionType,
  Survey,
  SurveyStatus,
} from '@prisma/client';
import { assertOpdAccess } from '../../common/auth/opd-scope.util';
import type { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { DashboardIkmQueryDto } from './dto/dashboard-ikm-query.dto';
import type { ExportFormat } from './dto/export-results-query.dto';
import { IkmDashboardEntity, IkmDashboardItemEntity } from './entities/ikm-dashboard.entity';
import {
  IkmResultEntity,
  IkmUnsurEntity,
  SebaranNilaiEntity,
  SebaranSkorEntity,
} from './entities/ikm-result.entity';
import { EXPORT_CONTENT_TYPES, ExportedFile, IkmExportService } from './ikm-export.service';
import { TIDAK_DIBUANG } from '../surveys/survey-scope.util';

/** Skala jawaban PermenPANRB 14/2017: 1 sampai 4. */
const NILAI_SKALA = [1, 2, 3, 4];

const round = (value: number, decimals: number): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

/** Kategori mutu sesuai tabel konversi PermenPANRB 14/2017 (Lampiran A PRD). */
function mutuFromNilai(nilaiIkm: number): IkmMutu {
  if (nilaiIkm <= 64.99) return IkmMutu.D;
  if (nilaiIkm <= 76.6) return IkmMutu.C;
  if (nilaiIkm <= 88.3) return IkmMutu.B;
  return IkmMutu.A;
}

/**
 * Sumber rumus tunggal perhitungan IKM (PermenPANRB No. 14 Tahun 2017):
 * NRR per unsur = Σnilai ÷ jumlah responden; bobot = 1 ÷ jumlah unsur;
 * Nilai IKM = (Σ NRR tertimbang) × 25; mutu dari tabel konversi.
 */
/**
 * Penyaring `periode` untuk Prisma (6 Oktober 2026).
 *
 * Penyaring di antarmuka dipisah menjadi Tahun (wajib) + Triwulan (boleh
 * "Semua") atas permintaan pengguna, dan "Semua Triwulan" mengirim nilai
 * BERTAHUN SAJA (`2026`) alih-alih periode kanonik (`2026-Q2`). Kecocokan
 * persis akan mengembalikan nol baris untuk setiap survei yang ada.
 *
 * AWALAN YANG DIJANGKARKAN TANDA HUBUNG, bukan `contains` dan bukan
 * `startsWith('2026')` begitu saja: tanpa tanda hubung, `20261-Q1` -- tahun
 * yang sama sekali lain -- ikut tercocok.
 */
const TAHUN_SAJA = /^\d{4}$/;

function filterPeriode(periode: string): Prisma.StringFilter | string {
  return TAHUN_SAJA.test(periode) ? { startsWith: `${periode}-` } : periode;
}

@Injectable()
export class IkmService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ikmExportService: IkmExportService,
  ) {}

  /** Hasil IKM survei (live-compute) — Admin OPD (miliknya) & Admin Kabupaten. */
  async getResults(surveyId: number, user: CurrentUser): Promise<IkmResultEntity> {
    const survey = await this.prisma.survey.findFirst({
      where: { id: surveyId, ...TIDAK_DIBUANG },
    });
    if (!survey) {
      throw new NotFoundException(`Survei dengan id ${surveyId} tidak ditemukan`);
    }
    assertOpdAccess(user, survey.opdId);
    const [result, nilaiRataRata, sebaranSkor] = await Promise.all([
      this.computeResult(survey),
      this.hitungNilaiRataRata(survey.id),
      this.hitungSebaranSkor(survey.id),
    ]);
    result.nilaiRataRata = nilaiRataRata;
    result.sebaranSkor = sebaranSkor;
    return result;
  }

  /**
   * SEBARAN SKOR (8 Oktober 2026, permintaan pengguna: kartu "Distribusi Skor
   * Belum Tersedia" diganti fitur sungguhan): berapa responden memilih tiap nilai
   * 1-4 pada TIAP pertanyaan skala satu survei.
   *
   * SEMUA pertanyaan skala, bukan hanya 9 unsur baku. Survei yang unsur bakunya
   * dihapus -- atau yang tak pernah memuatnya -- tak dapat dinilai IKM-nya;
   * membatasi sebaran ke unsur baku membuat kartu ini kosong lagi tepat untuk
   * survei yang sama (empat survei aktif di data pengembangan).
   *
   * Dua kueri, dan tak ada yang lebih: daftar pertanyaan skala berurut, lalu
   * SATU `groupBy` jawaban per (pertanyaan, nilai). Sengaja bukan di
   * `computeResult`, alasannya sama dengan `hitungNilaiRataRata`: dashboard dan
   * statistik publik memanggilnya untuk setiap survei aktif, dan snapshot IKM
   * menyimpan keluarannya.
   *
   * Keempat nilai SELALU ada per pertanyaan (0 bila tak dipilih): antarmuka
   * menggambar bilah bertumpuk empat segmen dan tak perlu menebak yang hilang.
   * Nilai di luar 1-4 diabaikan -- skala dijaga saat pengiriman, ini pagar
   * terhadap baris lama yang menyimpang, bukan jalur yang diharapkan.
   *
   * Tanpa pertanyaan skala kueri jawaban dilewati sama sekali.
   */
  async hitungSebaranSkor(surveyId: number): Promise<SebaranSkorEntity[]> {
    const pertanyaan = await this.prisma.question.findMany({
      where: { surveyId, tipe: QuestionType.skala },
      orderBy: { urutan: 'asc' },
      select: { id: true, teks: true, kodeUnsur: true },
    });
    if (pertanyaan.length === 0) {
      return [];
    }

    const baris = await this.prisma.answer.groupBy({
      by: ['questionId', 'nilai'],
      where: { nilai: { not: null }, question: { surveyId, tipe: QuestionType.skala } },
      _count: { _all: true },
    });
    const jumlahPer = new Map<string, number>();
    for (const b of baris) {
      jumlahPer.set(`${b.questionId}:${b.nilai}`, b._count._all);
    }

    return pertanyaan.map((p) => {
      const sebaran = NILAI_SKALA.map(
        (nilai) =>
          new SebaranNilaiEntity({ nilai, jumlah: jumlahPer.get(`${p.id}:${nilai}`) ?? 0 }),
      );
      return new SebaranSkorEntity({
        pertanyaanId: p.id,
        kodeUnsur: p.kodeUnsur,
        teks: p.teks,
        total: sebaran.reduce((acc, s) => acc + s.jumlah, 0),
        sebaran,
      });
    });
  }

  /**
   * NILAI RATA-RATA satu survei: rata-rata SEMUA jawaban skala (1-4) dari semua
   * responden (7 Oktober 2026, permintaan pengguna: tampilkan nilai rata-rata di
   * halaman respons, tabel survei, dan statistik).
   *
   * BUKAN IKM, dan sengaja tidak dihitung di `computeResult`. IKM menuntut 9
   * unsur baku; survei yang unsur bakunya dihapus -- atau yang memang tak pernah
   * memuatnya -- tak dapat dinilai IKM-nya, padahal jawaban skalanya ada. Di data
   * pengembangan, empat survei aktif yang sudah menerima jawaban berada dalam
   * keadaan itu dan menampilkan "-" di setiap layar. Rata-rata ini tetap terhitung
   * bagi mereka.
   *
   * Keduanya bisa BERBEDA untuk survei yang sama. IKM merata-ratakan sembilan
   * NRR berbobot sama; ini merata-ratakan setiap jawaban skala, termasuk
   * pertanyaan skala tambahan di luar sembilan unsur. Karena itu angkanya
   * dilabeli terpisah di antarmuka, dan definisinya sama dengan nilai rata-rata
   * per respons yang sudah ada (survey.adapter.js `averageScore`).
   *
   * Hanya jawaban tipe `skala` yang berNILAI: jawaban teks dan pilihan tak punya
   * `nilai`, sehingga penyaring tipenya tak mengubah hasil -- ia hanya membuat
   * maksudnya tersurat dan menjaga angkanya bila kelak tipe lain ikut menyimpan
   * `nilai`.
   *
   * `null` bila belum ada satu pun jawaban skala: tak ada rata-rata yang dapat
   * diklaim, dan "0" akan terbaca sebagai hasil ukur terburuk.
   *
   * Satu agregat per survei, sama pola N+1-nya dengan `computeResult`; daftar
   * survei dibatasi 100 baris per permintaan.
   */
  async hitungNilaiRataRata(surveyId: number): Promise<number | null> {
    const agregat = await this.prisma.answer.aggregate({
      where: {
        nilai: { not: null },
        question: { tipe: QuestionType.skala },
        response: { surveyId },
      },
      _avg: { nilai: true },
    });
    return agregat._avg.nilai === null ? null : round(agregat._avg.nilai, 2);
  }

  /**
   * Hitung ulang & simpan snapshot ke `ikm_results` (dipanggil saat survei berstatus `ditutup`).
   * Tidak melakukan apa pun bila belum ada responden — tidak ada yang bermakna untuk disimpan.
   */
  async snapshot(surveyId: number): Promise<void> {
    // SENGAJA tanpa penyaring TIDAK_DIBUANG. Pemanggilnya sudah memastikan
    // surveinya sah, dan saat survei aktif dibuang ke Sampah penutupannya
    // justru berjalan SESUDAH `deleted_at` terisi. Menyaring di sini membuat
    // snapshot IKM terakhir diam-diam gagal, tepat pada survei yang angkanya
    // paling perlu diselamatkan.
    const survey = await this.prisma.survey.findUnique({ where: { id: surveyId } });
    if (!survey) {
      return;
    }
    const result = await this.computeResult(survey);
    if (result.nilaiIkm === null || result.mutu === null) {
      return;
    }

    const nrrPerUnsurJson = result.nrrPerUnsur as unknown as Prisma.InputJsonValue;
    await this.prisma.ikmResult.upsert({
      where: { surveyId_periode: { surveyId: survey.id, periode: survey.periode } },
      create: {
        surveyId: survey.id,
        periode: survey.periode,
        nrrPerUnsur: nrrPerUnsurJson,
        nilaiIkm: result.nilaiIkm,
        mutu: result.mutu,
        jumlahResponden: result.jumlahResponden,
      },
      update: {
        nrrPerUnsur: nrrPerUnsurJson,
        nilaiIkm: result.nilaiIkm,
        mutu: result.mutu,
        jumlahResponden: result.jumlahResponden,
        dihitungPada: new Date(),
      },
    });
  }

  /**
   * Ringkasan ringan (jumlah responden + nilai IKM) untuk daftar survei (INT-9) — reuse
   * rumus tunggal `computeResult` tanpa expose rincian NRR per unsur yang tak dibutuhkan di list.
   */
  async getSummary(survey: Survey): Promise<{
    respondentsCount: number;
    nilaiIkm: number | null;
    nilaiRataRata: number | null;
  }> {
    const [result, nilaiRataRata] = await Promise.all([
      this.computeResult(survey),
      this.hitungNilaiRataRata(survey.id),
    ]);
    return {
      respondentsCount: result.jumlahResponden,
      nilaiIkm: result.nilaiIkm,
      nilaiRataRata,
    };
  }

  /** Ekspor laporan hasil IKM (CSV/Excel/PDF) — akses sama dengan `getResults`. */
  async exportResults(
    surveyId: number,
    format: ExportFormat,
    user: CurrentUser,
  ): Promise<ExportedFile> {
    const survey = await this.prisma.survey.findFirst({
      where: { id: surveyId, ...TIDAK_DIBUANG },
      include: { opd: true },
    });
    if (!survey) {
      throw new NotFoundException(`Survei dengan id ${surveyId} tidak ditemukan`);
    }
    assertOpdAccess(user, survey.opdId);
    const result = await this.computeResult(survey);
    const ctx = { surveyJudul: survey.judul, opdNama: survey.opd.nama, result };

    const filename = this.ikmExportService.buildFilename(surveyId, result.periode, format);
    if (format === 'csv') {
      return {
        buffer: this.ikmExportService.toCsv(ctx),
        filename,
        contentType: EXPORT_CONTENT_TYPES.csv,
      };
    }
    if (format === 'excel') {
      return {
        buffer: await this.ikmExportService.toExcel(ctx),
        filename,
        contentType: EXPORT_CONTENT_TYPES.excel,
      };
    }
    return {
      buffer: await this.ikmExportService.toPdf(ctx),
      filename,
      contentType: EXPORT_CONTENT_TYPES.pdf,
    };
  }

  /**
   * Agregat & perbandingan IKM seluruh OPD (DASH-1, Admin Kabupaten) — gabungan
   * snapshot `ikm_results` (survei `ditutup`, angka final) DAN live-compute survei
   * `aktif` yang sudah punya responden (2026-08-05, temuan audit: SEBELUMNYA dashboard
   * ini buta total thd survei yang masih berjalan sampai ditutup, walau responden
   * sudah masuk -- padahal dashboard Admin OPD sudah live-compute lebih dulu, lihat
   * `DashboardService.getOpdDashboard`). Tiap baris ditandai `status` supaya
   * pembaca tahu mana angka final vs yang masih bisa berubah, terfilter
   * periode/jenis layanan (berlaku utk KEDUA sumber).
   */
  async getDashboard(query: DashboardIkmQueryDto): Promise<IkmDashboardEntity> {
    const where: Prisma.IkmResultWhereInput = {};
    if (query.periode) {
      where.periode = filterPeriode(query.periode);
    }
    if (query.jenisLayanan) {
      where.survey = { opd: { jenisLayanan: query.jenisLayanan } };
    }

    const closedRows = await this.prisma.ikmResult.findMany({
      where,
      include: { survey: { include: { opd: true } } },
    });
    const closedItems = closedRows
      // Survei yang DIBUKA KEMBALI (31 Agustus 2026) tetap menyimpan snapshot
      // dari saat ia ditutup -- dan memang harus, itu catatan resmi periode
      // tersebut. Tapi ia kini juga ikut `activeSurveys` di bawah, sehingga
      // tanpa saringan ini survei yang sama masuk DUA KALI: sekali dilabeli
      // `ditutup` dari snapshot, sekali `aktif` dari live-compute. Yang rusak
      // bukan cuma daftarnya -- `rataRataIkm` & `totalResponden` menghitung
      // ganda. Selama survei masih aktif, angkanya adalah hasil live; itu
      // aturan yang sama dengan `getResults`, yang tak pernah membaca snapshot.
      .filter((row) => row.survey.status !== SurveyStatus.aktif)
      .map((row) => ({
        opdId: row.survey.opdId,
        opdNama: row.survey.opd.nama,
        jenisLayanan: row.survey.opd.jenisLayanan,
        surveyId: row.surveyId,
        judul: row.survey.judul,
        periode: row.periode,
        nilaiIkm: Number(row.nilaiIkm),
        mutu: row.mutu,
        jumlahResponden: row.jumlahResponden,
        status: SurveyStatus.ditutup,
      }));

    const activeSurveyWhere: Prisma.SurveyWhereInput = {
      status: SurveyStatus.aktif,
      ...TIDAK_DIBUANG,
    };
    if (query.periode) {
      activeSurveyWhere.periode = filterPeriode(query.periode);
    }
    if (query.jenisLayanan) {
      activeSurveyWhere.opd = { jenisLayanan: query.jenisLayanan };
    }
    const activeSurveys = await this.prisma.survey.findMany({
      where: activeSurveyWhere,
      include: { opd: true },
    });
    const activeComputed = await Promise.all(
      activeSurveys.map(async (survey) => ({ survey, result: await this.computeResult(survey) })),
    );
    const activeItems = activeComputed
      .filter(({ result }) => result.nilaiIkm !== null && result.mutu !== null)
      .map(({ survey, result }) => ({
        opdId: survey.opdId,
        opdNama: survey.opd.nama,
        jenisLayanan: survey.opd.jenisLayanan,
        surveyId: survey.id,
        judul: survey.judul,
        periode: survey.periode,
        nilaiIkm: result.nilaiIkm as number,
        mutu: result.mutu as IkmMutu,
        jumlahResponden: result.jumlahResponden,
        status: SurveyStatus.aktif,
      }));

    const items = [...closedItems, ...activeItems]
      .sort((a, b) => b.nilaiIkm - a.nilaiIkm)
      .map((item, index) => new IkmDashboardItemEntity({ peringkat: index + 1, ...item }));

    const rataRataIkm =
      items.length > 0
        ? round(items.reduce((acc, item) => acc + item.nilaiIkm, 0) / items.length, 2)
        : null;
    const totalOpd = new Set(items.map((item) => item.opdId)).size;
    const totalResponden = items.reduce((acc, item) => acc + item.jumlahResponden, 0);

    const complaintWhere: Prisma.ComplaintWhereInput = query.jenisLayanan
      ? { opd: { jenisLayanan: query.jenisLayanan } }
      : {};
    const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000);

    const [openComplaints, newComplaints, activeOpdCount, opdWithActiveSurveyCount] =
      await Promise.all([
        this.prisma.complaint.count({
          where: {
            ...complaintWhere,
            status: { in: [ComplaintStatus.diterima, ComplaintStatus.diproses] },
          },
        }),
        this.prisma.complaint.count({
          where: { ...complaintWhere, createdAt: { gte: sevenDaysAgo } },
        }),
        this.prisma.opd.count({ where: { isActive: true } }),
        this.prisma.opd.count({
          where: { isActive: true, surveys: { some: { status: SurveyStatus.aktif } } },
        }),
      ]);
    const systemActivityPercent =
      activeOpdCount > 0 ? round((opdWithActiveSurveyCount / activeOpdCount) * 100, 1) : null;

    return new IkmDashboardEntity({
      items,
      rataRataIkm,
      totalOpd,
      totalResponden,
      openComplaints,
      newComplaints,
      systemActivityPercent,
    });
  }

  /**
   * Inti perhitungan — dipisah agar dipakai bersama oleh live-compute & snapshot.
   * PUBLIK (2026-08-05) supaya `DashboardService.getStatistics` (endpoint publik,
   * tanpa `CurrentUser`) bisa ikut menghitung survei aktif secara live tanpa
   * duplikasi rumus IKM di luar sumber kebenaran tunggal ini.
   */
  async computeResult(survey: Survey): Promise<IkmResultEntity> {
    const unsurQuestions = await this.prisma.question.findMany({
      where: { surveyId: survey.id, isIkmUnsur: true },
      include: { answers: { select: { nilai: true } } },
      orderBy: { urutan: 'asc' },
    });
    const jumlahResponden = await this.prisma.surveyResponse.count({
      where: { surveyId: survey.id },
    });

    // Belum dapat dinilai: tanpa pertanyaan unsur atau belum ada responden.
    if (unsurQuestions.length === 0 || jumlahResponden === 0) {
      return new IkmResultEntity({
        surveyId: survey.id,
        periode: survey.periode,
        jumlahResponden,
        nrrPerUnsur: [],
        nilaiIkm: null,
        mutu: null,
        dihitungPada: new Date(),
      });
    }

    const bobot = 1 / unsurQuestions.length;
    let nilaiIkmRaw = 0;
    const nrrPerUnsur = unsurQuestions.map((q) => {
      const sum = q.answers.reduce((acc, a) => acc + (a.nilai ?? 0), 0);
      const nrr = sum / jumlahResponden;
      const nrrTertimbang = nrr * bobot;
      nilaiIkmRaw += nrrTertimbang;
      return new IkmUnsurEntity({
        kodeUnsur: q.kodeUnsur ?? '',
        teks: q.teks,
        nrr: round(nrr, 2),
        bobot: round(bobot, 4),
        nrrTertimbang: round(nrrTertimbang, 4),
      });
    });
    const nilaiIkm = round(nilaiIkmRaw * 25, 2);

    return new IkmResultEntity({
      surveyId: survey.id,
      periode: survey.periode,
      jumlahResponden,
      nrrPerUnsur,
      nilaiIkm,
      mutu: mutuFromNilai(nilaiIkm),
      dihitungPada: new Date(),
    });
  }
}
