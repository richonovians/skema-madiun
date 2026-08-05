import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IkmMutu } from '@prisma/client';
import { BaseEntity } from '../../../common/entities/base.entity';
import { PeriodePointEntity } from './statistics.entity';

export class PerformanceMetricEntity extends BaseEntity<PerformanceMetricEntity> {
  @ApiProperty({ example: 'U1' })
  code: string;

  @ApiProperty({ example: 'Persyaratan' })
  name: string;

  @ApiProperty({ description: 'NRR unsur ini (realisasi), skala 1-4' })
  realization: number;

  @ApiProperty({ description: 'Target NRR -- konstanta nilai skala maksimum (4.00)' })
  target: number;
}

export class RecentFeedbackEntity extends BaseEntity<RecentFeedbackEntity> {
  @ApiProperty()
  id: number;

  @ApiProperty({ description: 'Jawaban tipe teks (saran/kritik)' })
  text: string;

  @ApiPropertyOptional({
    description:
      'Rata-rata nilai skala LAIN pada respons yang sama (proxy "rating", BUKAN field backend tersendiri) -- null bila respons ini tak punya jawaban skala',
  })
  ratingAvg: number | null;

  @ApiProperty()
  submittedAt: Date;

  // SENGAJA TAK ADA nama/identitas pengisi (D4, 2026-08-05) -- respons survei
  // anonim by design (lihat ResponseEntity backend), konsisten dgn keputusan
  // "hapus nama" pada recentFeedback dashboard Admin OPD.
}

/** Hasil `GET /dashboard/opd` (INT-12, Admin OPD). */
export class OpdDashboardEntity extends BaseEntity<OpdDashboardEntity> {
  @ApiPropertyOptional({
    description: 'Nilai IKM live-compute dari survei terbaru non-draft OPD ini',
  })
  ikmScore: number | null;

  @ApiPropertyOptional({ enum: IkmMutu })
  ikmMutu: IkmMutu | null;

  @ApiProperty({ description: 'Total responden lintas SEMUA survei OPD ini (all-time)' })
  totalRespondents: number;

  @ApiPropertyOptional({
    description:
      'Persentase perubahan jumlah responden bulan ini vs bulan lalu. Null bila bulan lalu tak ada data pembanding (bukan 0%, utk menghindari angka menyesatkan).',
  })
  respondentTrendPercent: number | null;

  @ApiProperty({ description: 'Jumlah tiket pengaduan belum selesai (status diterima/diproses)' })
  activeTickets: number;

  @ApiPropertyOptional({
    description:
      'Rata-rata waktu penyelesaian pengaduan (jam), dihitung dari createdAt->updatedAt pengaduan berstatus selesai (D3). Null bila belum ada pengaduan selesai.',
  })
  avgResponseHours: number | null;

  @ApiProperty({
    description: 'Target SLA (jam) -- konstanta 24 jam/1 hari kerja (D3, dapat disesuaikan)',
  })
  slaTargetHours: number;

  @ApiPropertyOptional({
    description:
      'Persentase pengaduan berstatus selesai dari total pengaduan OPD ini (D3). Null bila belum ada pengaduan.',
  })
  completionRate: number | null;

  @ApiProperty({ type: PerformanceMetricEntity, isArray: true })
  performanceMetrics: PerformanceMetricEntity[];

  @ApiProperty({
    type: PeriodePointEntity,
    isArray: true,
    description: 'Tren nilai IKM OPD ini per periode triwulan (D5), dari snapshot ikm_results',
  })
  ikmTrend: PeriodePointEntity[];

  @ApiProperty({ type: RecentFeedbackEntity, isArray: true })
  recentFeedback: RecentFeedbackEntity[];
}
