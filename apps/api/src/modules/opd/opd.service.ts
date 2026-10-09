import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ComplaintStatus, Prisma, Role, SurveyStatus } from '@prisma/client';
import { PaginatedResult, paginate } from '../../common/dto/paginated-result';
import { PrismaService } from '../../prisma/prisma.service';
import { ListOpdQueryDto } from './dto/list-opd-query.dto';
import { OpdEntity } from './entities/opd.entity';
import { OpdSyncReport } from './entities/opd-sync-report.entity';
import { HelpdeskOpd, OpdSource } from './interfaces/opd-source.interface';
import { OPD_SOURCE } from './opd.constants';
import { TIDAK_DIBUANG } from '../surveys/survey-scope.util';

@Injectable()
export class OpdService {
  private readonly logger = new Logger(OpdService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(OPD_SOURCE) private readonly opdSource: OpdSource,
  ) {}

  /** Daftar OPD dari cache lokal (paginated + filter). */
  async findAll(query: ListOpdQueryDto): Promise<PaginatedResult<OpdEntity>> {
    const { page, limit, search, isActive } = query;

    const where: Prisma.OpdWhereInput = {};
    if (search) {
      where.OR = [
        { nama: { contains: search, mode: 'insensitive' } },
        { kode: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.opd.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { nama: 'asc' },
      }),
      this.prisma.opd.count({ where }),
    ]);

    const { activeSurveysByOpd, openComplaintsByOpd, adminsByOpd } = await this.countsByOpd(
      rows.map((row) => row.id),
    );

    const items = rows.map(
      (row) =>
        new OpdEntity({
          ...row,
          activeSurveys: activeSurveysByOpd.get(row.id) ?? 0,
          openComplaints: openComplaintsByOpd.get(row.id) ?? 0,
          adminCount: adminsByOpd.get(row.id) ?? 0,
        }),
    );

    return paginate(items, total, page, limit);
  }

  /** Hitung survei aktif & pengaduan belum tuntas per OPD dalam satu putaran (INT-10). */
  /**
   * Tulis satu OPD dari sumber, TAHAN BALAPAN (9 Oktober 2026, pilihan
   * pengguna: jalur B).
   *
   * `findFirst` lalu `create` adalah baca-lalu-tulis: dua sinkronisasi
   * bersamaan dapat sama-sama tak menemukan baris lalu sama-sama menyisipkan
   * `externalId` yang sama. Sebelum ini pelanggaran unique-nya naik sebagai
   * 500 dengan sinkronisasi separuh jalan.
   *
   * MENGAPA BUKAN SATU `INSERT ... ON CONFLICT`, yang biasanya memang jawaban
   * untuk pola ini: tabel `opd` punya DUA unique terpisah, `external_id` dan
   * `kode`, sedangkan satu klausa `ON CONFLICT` hanya dapat menargetkan satu
   * constraint. Dan keduanya memang dibutuhkan -- baris ber-`kode` sama
   * SENGAJA diadopsi (lihat `stub-opd-source.ts`) agar sinkronisasi tak
   * bentrok dengan baris yang dibuat sebelum `externalId` dikenal. Karena itu
   * polanya: sisipkan secara optimis, dan bila constraint MANA PUN berbunyi,
   * baca ulang lalu perbarui.
   *
   * BACA ULANGNYA DIJAMIN MENEMUKAN BARISNYA. Postgres menahan `INSERT` kedua
   * pada indeks unique sampai transaksi pertama selesai, dan baru melempar
   * galat duplikat SESUDAH yang pertama commit. Begitu P2002 tertangkap,
   * barisnya sudah terlihat oleh transaksi kita.
   *
   * Yang TIDAK ditelan: galat selain P2002, dan P2002 yang baca-ulangnya tetap
   * kosong. Yang kedua bukan balapan yang pola ini maksudkan -- mungkin
   * constraint lain -- dan melaporkannya sebagai "diperbarui" akan menyatakan
   * sinkronisasi sukses yang tak menulis apa pun.
   */
  private async simpanDariSumber(
    externalId: string,
    kode: string,
    data: Prisma.OpdCreateInput,
  ): Promise<'created' | 'updated'> {
    const where = { OR: [{ externalId }, { kode }] };

    const existing = await this.prisma.opd.findFirst({ where });
    if (existing) {
      await this.prisma.opd.update({ where: { id: existing.id }, data });
      return 'updated';
    }

    try {
      await this.prisma.opd.create({ data });
      return 'created';
    } catch (err) {
      if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== 'P2002') {
        throw err;
      }
      const sudahAda = await this.prisma.opd.findFirst({ where });
      if (!sudahAda) {
        throw err;
      }
      this.logger.warn(
        `OPD ${kode} disisipkan sinkronisasi lain lebih dulu; barisnya diperbarui, bukan dibuat.`,
      );
      await this.prisma.opd.update({ where: { id: sudahAda.id }, data });
      return 'updated';
    }
  }

  private async countsByOpd(opdIds: number[]): Promise<{
    activeSurveysByOpd: Map<number, number>;
    openComplaintsByOpd: Map<number, number>;
    adminsByOpd: Map<number, number>;
  }> {
    if (opdIds.length === 0) {
      return {
        activeSurveysByOpd: new Map(),
        openComplaintsByOpd: new Map(),
        adminsByOpd: new Map(),
      };
    }

    const [surveyCounts, complaintCounts, adminCounts] = await Promise.all([
      this.prisma.survey.groupBy({
        by: ['opdId'],
        where: { opdId: { in: opdIds }, status: SurveyStatus.aktif, ...TIDAK_DIBUANG },
        _count: { _all: true },
      }),
      this.prisma.complaint.groupBy({
        by: ['opdId'],
        where: {
          opdId: { in: opdIds },
          status: { in: [ComplaintStatus.diterima, ComplaintStatus.diproses] },
        },
        _count: { _all: true },
      }),
      // ADMIN AKTIF PER OPD (4 Oktober 2026). `roles: { has: opd }`, bukan
      // kesamaan: kolomnya larik sejak peran jamak, dan akun yang memegang
      // peran `opd` bersama peran lain tetap seorang admin bagi OPD-nya.
      //
      // `isActive: true` disengaja. Akun yang dinonaktifkan tak dapat masuk,
      // jadi menghitungnya akan membuat OPD tanpa pengelola terlihat terkelola
      // -- persis kekeliruan yang hitungan ini dibuat untuk mencegahnya.
      this.prisma.user.groupBy({
        by: ['opdId'],
        where: { opdId: { in: opdIds }, roles: { has: Role.opd }, isActive: true },
        _count: { _all: true },
      }),
    ]);

    return {
      activeSurveysByOpd: new Map(surveyCounts.map((c) => [c.opdId, c._count._all])),
      // `opdId` boleh null pada `users` (akun warga & kabupaten), jadi penjagaan
      // null di sini wajib sebagaimana pada pengaduan di bawah.
      adminsByOpd: new Map(
        adminCounts.flatMap((c) =>
          c.opdId == null ? [] : [[c.opdId, c._count._all] as [number, number]],
        ),
      ),
      // `flatMap` + penjagaan null, bukan `map`: sejak `complaints.opd_id`
      // boleh NULL (6 September 2026) groupBy mengembalikan `number | null`.
      // Penyaring `where` di atas sudah membatasi ke opdIds yang ada, jadi ini
      // tak pernah terpakai -- tapi membiarkannya berarti pengaduan tanpa
      // tujuan kelak terhitung sebagai milik "OPD null".
      openComplaintsByOpd: new Map(
        complaintCounts.flatMap((c) =>
          c.opdId == null ? [] : [[c.opdId, c._count._all] as [number, number]],
        ),
      ),
    };
  }

  /** Detail satu OPD dari cache lokal. */
  async findOne(id: number): Promise<OpdEntity> {
    const opd = await this.prisma.opd.findUnique({ where: { id } });
    if (!opd) {
      throw new NotFoundException(`OPD dengan id ${id} tidak ditemukan`);
    }
    return new OpdEntity(opd);
  }

  /**
   * Sinkronisasi OPD dari Helpdesk.
   * - Upsert by `externalId` (fallback adopsi baris ber-`kode` sama agar tak bentrok unik).
   * - OPD yang pernah disinkron tetapi HILANG dari source → dinonaktifkan (`isActive=false`),
   *   TIDAK dihapus (jaga FK surveys/complaints).
   * - Record tak lengkap dilewati (skipped).
   * - Sumber Helpdesk tidak tersedia → 503, cache TIDAK diubah.
   */
  async syncFromSource(): Promise<OpdSyncReport> {
    const start = Date.now();

    let items: HelpdeskOpd[];
    try {
      items = await this.opdSource.fetchOpdList();
    } catch (error) {
      this.logger.error(
        'Sinkronisasi OPD gagal: sumber data Helpdesk tidak tersedia',
        error instanceof Error ? error.stack : undefined,
      );
      throw new ServiceUnavailableException('Sumber data OPD (Helpdesk) tidak tersedia');
    }

    const syncedAt = new Date();
    let created = 0;
    let updated = 0;
    let skipped = 0;
    let deactivated = 0;
    const seenExternalIds: string[] = [];

    for (const item of items) {
      if (!item.externalId || !item.kode || !item.nama) {
        skipped += 1;
        continue;
      }
      seenExternalIds.push(item.externalId);

      const data = {
        externalId: item.externalId,
        nama: item.nama,
        kode: item.kode,
        jenisLayanan: item.jenisLayanan ?? null,
        penanggungJawab: item.penanggungJawab ?? null,
        isActive: item.isActive ?? true,
        syncedAt,
      };

      if ((await this.simpanDariSumber(item.externalId, item.kode, data)) === 'created') {
        created += 1;
      } else {
        updated += 1;
      }
    }

    // OPD-4: nonaktifkan OPD tersinkron (ber-externalId) yang hilang dari source.
    // `notIn` pada kolom nullable otomatis mengecualikan baris ber-externalId null.
    // Guard: hanya jalan bila ada externalId valid (hindari mass-deactivate saat source kosong/anomali).
    if (seenExternalIds.length > 0) {
      const result = await this.prisma.opd.updateMany({
        where: { isActive: true, externalId: { notIn: seenExternalIds } },
        data: { isActive: false, syncedAt },
      });
      deactivated = result.count;
    }

    const report = new OpdSyncReport({
      fetched: items.length,
      created,
      updated,
      deactivated,
      skipped,
      durationMs: Date.now() - start,
      syncedAt,
    });

    this.logger.log(
      `Sinkronisasi OPD selesai: fetched=${report.fetched} created=${created} updated=${updated} deactivated=${deactivated} skipped=${skipped} (${report.durationMs}ms)`,
    );
    if (skipped > 0) {
      this.logger.warn(`${skipped} record OPD dilewati karena data tidak lengkap`);
    }

    return report;
  }
}
