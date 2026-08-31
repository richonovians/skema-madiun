import { Injectable, NotFoundException } from '@nestjs/common';
import { ComplaintStatus, IkmMutu, Prisma, Survey, SurveyStatus } from '@prisma/client';
import { assertOpdAccess } from '../../common/auth/opd-scope.util';
import type { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { DashboardIkmQueryDto } from './dto/dashboard-ikm-query.dto';
import type { ExportFormat } from './dto/export-results-query.dto';
import { IkmDashboardEntity, IkmDashboardItemEntity } from './entities/ikm-dashboard.entity';
import { IkmResultEntity, IkmUnsurEntity } from './entities/ikm-result.entity';
import { EXPORT_CONTENT_TYPES, ExportedFile, IkmExportService } from './ikm-export.service';

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
@Injectable()
export class IkmService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ikmExportService: IkmExportService,
  ) {}

  /** Hasil IKM survei (live-compute) — Admin OPD (miliknya) & Admin Kabupaten. */
  async getResults(surveyId: number, user: CurrentUser): Promise<IkmResultEntity> {
    const survey = await this.prisma.survey.findUnique({ where: { id: surveyId } });
    if (!survey) {
      throw new NotFoundException(`Survei dengan id ${surveyId} tidak ditemukan`);
    }
    assertOpdAccess(user, survey.opdId);
    return this.computeResult(survey);
  }

  /**
   * Hitung ulang & simpan snapshot ke `ikm_results` (dipanggil saat survei berstatus `ditutup`).
   * Tidak melakukan apa pun bila belum ada responden — tidak ada yang bermakna untuk disimpan.
   */
  async snapshot(surveyId: number): Promise<void> {
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
  async getSummary(survey: Survey): Promise<{ respondentsCount: number; nilaiIkm: number | null }> {
    const result = await this.computeResult(survey);
    return { respondentsCount: result.jumlahResponden, nilaiIkm: result.nilaiIkm };
  }

  /** Ekspor laporan hasil IKM (CSV/Excel/PDF) — akses sama dengan `getResults`. */
  async exportResults(
    surveyId: number,
    format: ExportFormat,
    user: CurrentUser,
  ): Promise<ExportedFile> {
    const survey = await this.prisma.survey.findUnique({
      where: { id: surveyId },
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
      where.periode = query.periode;
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

    const activeSurveyWhere: Prisma.SurveyWhereInput = { status: SurveyStatus.aktif };
    if (query.periode) {
      activeSurveyWhere.periode = query.periode;
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
