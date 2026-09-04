import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ComplaintStatus } from '@prisma/client';
import { BaseEntity } from '../../../common/entities/base.entity';

export class StatisticsSummaryEntity extends BaseEntity<StatisticsSummaryEntity> {
  @ApiPropertyOptional({
    description: 'Rata-rata nilai IKM lintas seluruh snapshot hasil survei (ikm_results)',
  })
  ikm: number | null;

  @ApiProperty()
  totalRespondents: number;

  @ApiProperty()
  totalComplaints: number;

  @ApiPropertyOptional({ description: 'Persentase pengaduan selesai lintas seluruh OPD (D3)' })
  completionRate: number | null;

  @ApiPropertyOptional({
    description: 'Rata-rata waktu penyelesaian pengaduan (hari) lintas seluruh OPD (D3)',
  })
  avgSlaDays: number | null;

  @ApiProperty({ description: 'Jumlah OPD berstatus aktif (cache Helpdesk)' })
  activeOpd: number;
}

export class PeriodePointEntity extends BaseEntity<PeriodePointEntity> {
  @ApiProperty({ example: '2026-Q2' })
  periode: string;

  @ApiProperty()
  value: number;
}

export class ComplaintStatusDistributionEntity extends BaseEntity<ComplaintStatusDistributionEntity> {
  @ApiProperty({ enum: ComplaintStatus })
  status: ComplaintStatus;

  @ApiProperty()
  count: number;
}

export class ComplaintCategoryDistributionEntity extends BaseEntity<ComplaintCategoryDistributionEntity> {
  @ApiProperty({ example: 'aduan' })
  kode: string;

  @ApiProperty({ example: 'Aduan' })
  nama: string;

  @ApiProperty()
  count: number;
}

/** Peringkat OPD berdasar rata-rata nilai IKM lintas snapshot `ikm_results` (publik -- ringkas, bukan detail penuh). */
export class TopOpdEntity extends BaseEntity<TopOpdEntity> {
  @ApiProperty()
  peringkat: number;

  @ApiProperty()
  opdId: number;

  @ApiProperty()
  opdNama: string;

  @ApiProperty()
  nilaiIkm: number;
}

export class ServiceElementAggregateEntity extends BaseEntity<ServiceElementAggregateEntity> {
  @ApiProperty({ example: 'U1' })
  code: string;

  @ApiProperty({ example: 'Persyaratan' })
  name: string;

  @ApiProperty({
    description: 'Rata-rata NRR unsur ini lintas SELURUH snapshot hasil survei semua OPD',
  })
  avgNrr: number;
}

export class ValueDistributionEntity extends BaseEntity<ValueDistributionEntity> {
  @ApiProperty({ description: 'Nilai skala (1-4)' })
  value: number;

  @ApiProperty({ description: 'Jumlah jawaban dgn nilai ini, lintas seluruh survei' })
  count: number;
}

export class StatisticsInsightEntity extends BaseEntity<StatisticsInsightEntity> {
  @ApiPropertyOptional({
    description:
      'Narasi analisis, diisi manual Admin Kabupaten (D6). Null bila belum pernah diisi.',
  })
  text: string | null;

  @ApiPropertyOptional()
  updatedAt: Date | null;
}

/** Hasil `GET /statistics` (INT-14, PUBLIK -- D2, tanpa autentikasi). */
export class StatisticsEntity extends BaseEntity<StatisticsEntity> {
  @ApiProperty({ type: StatisticsSummaryEntity })
  summary: StatisticsSummaryEntity;

  @ApiProperty({
    type: PeriodePointEntity,
    isArray: true,
    description: 'Tren nilai IKM rata-rata per periode triwulan (D5)',
  })
  ikmTrend: PeriodePointEntity[];

  @ApiProperty({
    type: PeriodePointEntity,
    isArray: true,
    description:
      'Tren jumlah pengaduan masuk per periode triwulan (D5, dibucket dari Complaint.createdAt)',
  })
  complaintTrend: PeriodePointEntity[];

  @ApiProperty({ type: ComplaintStatusDistributionEntity, isArray: true })
  complaintStatus: ComplaintStatusDistributionEntity[];

  @ApiProperty({ type: ComplaintCategoryDistributionEntity, isArray: true })
  complaintCategories: ComplaintCategoryDistributionEntity[];

  @ApiProperty({ type: ServiceElementAggregateEntity, isArray: true })
  serviceElements: ServiceElementAggregateEntity[];

  @ApiProperty({ type: ValueDistributionEntity, isArray: true })
  valueDistribution: ValueDistributionEntity[];

  @ApiProperty({
    type: TopOpdEntity,
    isArray: true,
    description: 'Top 5 OPD berdasar rata-rata nilai IKM',
  })
  topOpd: TopOpdEntity[];

  @ApiProperty({ type: StatisticsInsightEntity })
  insight: StatisticsInsightEntity;
}
