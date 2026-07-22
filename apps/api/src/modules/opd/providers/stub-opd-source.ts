import { Injectable } from '@nestjs/common';
import { HelpdeskOpd, OpdSource } from '../interfaces/opd-source.interface';

/**
 * Implementasi SEMENTARA (stub) dari OpdSource untuk pengembangan.
 * Mengembalikan fixture OPD dengan bentuk yang SAMA seperti respons API Helpdesk nanti,
 * sehingga dapat ditukar ke HelpdeskOpdClient tanpa mengubah logika sinkronisasi.
 *
 * BUKAN integrasi Helpdesk nyata. Kode OPD selaras dengan data seed agar upsert
 * (OPD-3) konsisten setelah seed diselaraskan (OPD-7).
 */
@Injectable()
export class StubOpdSource implements OpdSource {
  private readonly fixtures: HelpdeskOpd[] = [
    {
      externalId: 'HD-001',
      nama: 'Dinas Kesehatan',
      kode: 'DINKES',
      jenisLayanan: 'Kesehatan',
      penanggungJawab: 'Kepala Dinas Kesehatan',
      isActive: true,
    },
    {
      externalId: 'HD-002',
      nama: 'Dinas Pendidikan',
      kode: 'DISDIK',
      jenisLayanan: 'Pendidikan',
      penanggungJawab: 'Kepala Dinas Pendidikan',
      isActive: true,
    },
    {
      externalId: 'HD-003',
      nama: 'Dinas Kependudukan dan Pencatatan Sipil',
      kode: 'DUKCAPIL',
      jenisLayanan: 'Administrasi Kependudukan',
      penanggungJawab: 'Kepala Disdukcapil',
      isActive: true,
    },
  ];

  fetchOpdList(): Promise<HelpdeskOpd[]> {
    return Promise.resolve(this.fixtures);
  }
}
