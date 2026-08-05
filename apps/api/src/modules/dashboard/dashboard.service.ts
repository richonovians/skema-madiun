import { ForbiddenException, Injectable } from '@nestjs/common';
import { ComplaintStatus, Role, SurveyStatus } from '@prisma/client';
import type { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { IkmService } from '../ikm/ikm.service';
import { COMPLAINT_CATEGORIES } from '../reference/reference.constants';
import { periodeFromDate } from '../surveys/utils/periode.util';
import { UpdateInsightDto } from './dto/update-insight.dto';
import {
  OpdDashboardEntity,
  PerformanceMetricEntity,
  RecentFeedbackEntity,
} from './entities/opd-dashboard.entity';
import {
  ComplaintCategoryDistributionEntity,
  ComplaintStatusDistributionEntity,
  PeriodePointEntity,
  ServiceElementAggregateEntity,
  StatisticsEntity,
  StatisticsInsightEntity,
  StatisticsSummaryEntity,
  TopOpdEntity,
  ValueDistributionEntity,
} from './entities/statistics.entity';

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  COMPLAINT_CATEGORIES.map((c) => [c.kode, c.nama]),
);
const TOP_OPD_LIMIT = 5;

/**
 * SLA target (D3, 2026-08-05): backend TAK PUNYA sumber kebijakan SLA resmi
 * dari Diskominfo -- keputusan D3 mendelegasikan definisi ke developer.
 * 24 jam (1x24 jam) dipilih sbg default wajar layanan publik harian, sama
 * semangatnya dgn konstanta `target: 4.00` (NRR maksimum) yg sudah dipakai
 * performanceMetrics -- BUKAN kebijakan resmi, mudah disesuaikan bila
 * Diskominfo menetapkan target lain nanti.
 */
const SLA_TARGET_HOURS = 24;
const RECENT_FEEDBACK_LIMIT = 5;

const round = (value: number, decimals: number): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ikmService: IkmService,
  ) {}

  /** `GET /dashboard/opd` (INT-12) -- ringkasan utk Admin OPD, OPD-nya sendiri saja. */
  async getOpdDashboard(user: CurrentUser): Promise<OpdDashboardEntity> {
    if (user.role !== Role.opd || user.opdId == null) {
      throw new ForbiddenException(
        'Hanya Admin OPD dengan OPD tertaut yang memiliki dashboard ini',
      );
    }
    const opdId = user.opdId;

    const [
      latestSurvey,
      totalRespondents,
      activeTickets,
      resolvedComplaints,
      allComplaintsCount,
      feedbackAnswers,
      trend,
      ikmHistory,
    ] = await Promise.all([
      this.prisma.survey.findFirst({
        where: { opdId, status: { in: [SurveyStatus.aktif, SurveyStatus.ditutup] } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.surveyResponse.count({ where: { survey: { opdId } } }),
      this.prisma.complaint.count({
        where: { opdId, status: { in: [ComplaintStatus.diterima, ComplaintStatus.diproses] } },
      }),
      this.prisma.complaint.findMany({
        where: { opdId, status: ComplaintStatus.selesai },
        select: { createdAt: true, updatedAt: true },
      }),
      this.prisma.complaint.count({ where: { opdId } }),
      this.prisma.answer.findMany({
        where: { question: { tipe: 'teks', survey: { opdId } }, teks: { not: null } },
        select: {
          id: true,
          teks: true,
          response: {
            select: {
              submittedAt: true,
              answers: { where: { nilai: { not: null } }, select: { nilai: true } },
            },
          },
        },
        orderBy: { response: { submittedAt: 'desc' } },
        take: RECENT_FEEDBACK_LIMIT,
      }),
      this.getRespondentTrendPercent(opdId),
      this.prisma.ikmResult.findMany({
        where: { survey: { opdId } },
        select: { periode: true, nilaiIkm: true },
      }),
    ]);

    let ikmScore: number | null = null;
    let ikmMutu = null;
    let performanceMetrics: PerformanceMetricEntity[] = [];
    if (latestSurvey) {
      const result = await this.ikmService.getResults(latestSurvey.id, user);
      ikmScore = result.nilaiIkm;
      ikmMutu = result.mutu;
      performanceMetrics = result.nrrPerUnsur.map(
        (u) =>
          new PerformanceMetricEntity({
            code: u.kodeUnsur,
            name: u.teks,
            realization: u.nrr,
            target: 4.0,
          }),
      );
    }

    const avgResponseHours =
      resolvedComplaints.length > 0
        ? round(
            resolvedComplaints.reduce(
              (acc, c) => acc + (c.updatedAt.getTime() - c.createdAt.getTime()) / 3_600_000,
              0,
            ) / resolvedComplaints.length,
            1,
          )
        : null;

    const completionRate =
      allComplaintsCount > 0
        ? round((resolvedComplaints.length / allComplaintsCount) * 100, 2)
        : null;

    const recentFeedback = feedbackAnswers.map((a) => {
      const scaleValues = a.response.answers
        .map((x) => x.nilai)
        .filter((v): v is number => v != null);
      const ratingAvg =
        scaleValues.length > 0
          ? round(scaleValues.reduce((s, v) => s + v, 0) / scaleValues.length, 2)
          : null;
      return new RecentFeedbackEntity({
        id: a.id,
        text: a.teks as string,
        ratingAvg,
        submittedAt: a.response.submittedAt,
      });
    });

    const ikmTrend = this.bucketByPeriode(
      ikmHistory.map((r) => ({ periode: r.periode, value: Number(r.nilaiIkm) })),
    );

    return new OpdDashboardEntity({
      ikmScore,
      ikmMutu,
      totalRespondents,
      respondentTrendPercent: trend,
      activeTickets,
      avgResponseHours,
      slaTargetHours: SLA_TARGET_HOURS,
      completionRate,
      ikmTrend,
      performanceMetrics,
      recentFeedback,
    });
  }

  /** Persentase perubahan jumlah responden bulan ini vs bulan lalu (kalender). Null bila tak ada pembanding. */
  private async getRespondentTrendPercent(opdId: number): Promise<number | null> {
    const now = new Date();
    const startThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [thisMonthCount, lastMonthCount] = await Promise.all([
      this.prisma.surveyResponse.count({
        where: { survey: { opdId }, submittedAt: { gte: startThisMonth } },
      }),
      this.prisma.surveyResponse.count({
        where: { survey: { opdId }, submittedAt: { gte: startLastMonth, lt: startThisMonth } },
      }),
    ]);

    if (lastMonthCount === 0) {
      return null; // tak ada pembanding -- hindari angka menyesatkan (mis. "infinite growth")
    }
    return round(((thisMonthCount - lastMonthCount) / lastMonthCount) * 100, 1);
  }

  /** `GET /statistics` (INT-14, D2: PUBLIK tanpa autentikasi). */
  async getStatistics(): Promise<StatisticsEntity> {
    const [
      ikmResults,
      totalRespondents,
      totalComplaints,
      allComplaints,
      activeOpd,
      complaintStatusRows,
      complaintCategoryRows,
      scaleAnswerRows,
      insightRow,
    ] = await Promise.all([
      this.prisma.ikmResult.findMany({
        select: {
          nilaiIkm: true,
          periode: true,
          nrrPerUnsur: true,
          survey: { select: { opdId: true, opd: { select: { nama: true } } } },
        },
      }),
      this.prisma.surveyResponse.count(),
      this.prisma.complaint.count(),
      // Satu query dipakai utk DUA turunan (resolvedComplaints via filter status di
      // bawah, DAN bucket tren per triwulan) -- hindari 2x full-table scan Complaint.
      this.prisma.complaint.findMany({
        select: { createdAt: true, updatedAt: true, status: true },
      }),
      this.prisma.opd.count({ where: { isActive: true } }),
      this.prisma.complaint.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.complaint.groupBy({ by: ['kategori'], _count: { _all: true } }),
      this.prisma.answer.groupBy({
        by: ['nilai'],
        where: { nilai: { not: null } },
        _count: { _all: true },
      }),
      this.prisma.statisticsInsight.findUnique({ where: { id: 1 } }),
    ]);
    const resolvedComplaints = allComplaints.filter((c) => c.status === ComplaintStatus.selesai);

    const ikm =
      ikmResults.length > 0
        ? round(ikmResults.reduce((acc, r) => acc + Number(r.nilaiIkm), 0) / ikmResults.length, 2)
        : null;
    const avgSlaDays =
      resolvedComplaints.length > 0
        ? round(
            resolvedComplaints.reduce(
              (acc, c) => acc + (c.updatedAt.getTime() - c.createdAt.getTime()) / 86_400_000,
              0,
            ) / resolvedComplaints.length,
            1,
          )
        : null;
    const completionRate =
      totalComplaints > 0 ? round((resolvedComplaints.length / totalComplaints) * 100, 2) : null;

    const summary = new StatisticsSummaryEntity({
      ikm,
      totalRespondents,
      totalComplaints,
      completionRate,
      avgSlaDays,
      activeOpd,
    });

    const ikmTrend = this.bucketByPeriode(
      ikmResults.map((r) => ({ periode: r.periode, value: Number(r.nilaiIkm) })),
    );
    const complaintTrend = this.bucketByPeriode(
      allComplaints.map((c) => ({ periode: periodeFromDate(c.createdAt), value: 1 })),
      'sum',
    );

    const complaintStatus = complaintStatusRows.map(
      (row) =>
        new ComplaintStatusDistributionEntity({ status: row.status, count: row._count._all }),
    );

    const complaintCategories = complaintCategoryRows
      .map(
        (row) =>
          new ComplaintCategoryDistributionEntity({
            kode: row.kategori,
            nama: CATEGORY_LABEL[row.kategori] ?? row.kategori,
            count: row._count._all,
          }),
      )
      .sort((a, b) => b.count - a.count);

    const serviceElements = this.aggregateServiceElements(ikmResults);

    const valueDistribution = scaleAnswerRows
      .filter((row) => row.nilai != null)
      .map(
        (row) =>
          new ValueDistributionEntity({ value: row.nilai as number, count: row._count._all }),
      )
      .sort((a, b) => a.value - b.value);

    const topOpd = this.topOpdByIkm(ikmResults);

    const insight = new StatisticsInsightEntity({
      text: insightRow?.text ?? null,
      updatedAt: insightRow?.updatedAt ?? null,
    });

    return new StatisticsEntity({
      summary,
      ikmTrend,
      complaintTrend,
      complaintStatus,
      complaintCategories,
      serviceElements,
      valueDistribution,
      topOpd,
      insight,
    });
  }

  /** Isi/perbarui narasi `/statistics` (D6) -- Admin Kabupaten. Upsert baris tunggal (id=1). */
  async updateInsight(dto: UpdateInsightDto, user: CurrentUser): Promise<StatisticsInsightEntity> {
    const row = await this.prisma.statisticsInsight.upsert({
      where: { id: 1 },
      create: { id: 1, text: dto.text, updatedBy: user.userId },
      update: { text: dto.text, updatedBy: user.userId },
    });
    return new StatisticsInsightEntity({ text: row.text, updatedAt: row.updatedAt });
  }

  /** Rata-rata (default) atau jumlah nilai per periode triwulan, terurut kronologis (format kanonik = sortable). */
  private bucketByPeriode(
    rows: { periode: string; value: number }[],
    mode: 'avg' | 'sum' = 'avg',
  ): PeriodePointEntity[] {
    const buckets = new Map<string, number[]>();
    for (const row of rows) {
      const list = buckets.get(row.periode) ?? [];
      list.push(row.value);
      buckets.set(row.periode, list);
    }
    return Array.from(buckets.entries())
      .map(([periode, values]) => {
        const value =
          mode === 'sum'
            ? values.length
            : round(values.reduce((s, v) => s + v, 0) / values.length, 2);
        return new PeriodePointEntity({ periode, value });
      })
      .sort((a, b) => a.periode.localeCompare(b.periode));
  }

  /** Rata-rata NRR per kode unsur lintas SELURUH snapshot `ikm_results` (semua OPD). */
  private aggregateServiceElements(
    ikmResults: { nrrPerUnsur: unknown }[],
  ): ServiceElementAggregateEntity[] {
    const buckets = new Map<string, { name: string; values: number[] }>();
    for (const row of ikmResults) {
      const unsurList = row.nrrPerUnsur as { kodeUnsur: string; teks: string; nrr: number }[];
      for (const unsur of unsurList ?? []) {
        const entry = buckets.get(unsur.kodeUnsur) ?? { name: unsur.teks, values: [] };
        entry.values.push(unsur.nrr);
        buckets.set(unsur.kodeUnsur, entry);
      }
    }
    return Array.from(buckets.entries())
      .map(
        ([code, { name, values }]) =>
          new ServiceElementAggregateEntity({
            code,
            name,
            avgNrr: round(values.reduce((s, v) => s + v, 0) / values.length, 2),
          }),
      )
      .sort((a, b) => a.code.localeCompare(b.code));
  }

  /** Top OPD (rata-rata nilai IKM lintas snapshot `ikm_results`), diranking desc, dibatasi TOP_OPD_LIMIT. */
  private topOpdByIkm(
    ikmResults: { nilaiIkm: unknown; survey: { opdId: number; opd: { nama: string } } }[],
  ): TopOpdEntity[] {
    const buckets = new Map<number, { nama: string; values: number[] }>();
    for (const row of ikmResults) {
      const entry = buckets.get(row.survey.opdId) ?? { nama: row.survey.opd.nama, values: [] };
      entry.values.push(Number(row.nilaiIkm));
      buckets.set(row.survey.opdId, entry);
    }
    return Array.from(buckets.entries())
      .map(([opdId, { nama, values }]) => ({
        opdId,
        opdNama: nama,
        nilaiIkm: round(values.reduce((s, v) => s + v, 0) / values.length, 2),
      }))
      .sort((a, b) => b.nilaiIkm - a.nilaiIkm)
      .slice(0, TOP_OPD_LIMIT)
      .map((item, index) => new TopOpdEntity({ peringkat: index + 1, ...item }));
  }
}
