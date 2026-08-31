import { Injectable } from '@nestjs/common';
import { HelpdeskOpd, OpdSource } from '../interfaces/opd-source.interface';

/**
 * Implementasi SEMENTARA (stub) dari OpdSource untuk pengembangan.
 * Mengembalikan fixture OPD dengan bentuk yang SAMA seperti respons API Helpdesk nanti,
 * sehingga dapat ditukar ke HelpdeskOpdClient tanpa mengubah logika sinkronisasi.
 *
 * BUKAN integrasi Helpdesk nyata, tetapi `externalId` & `kode`-nya sekarang NILAI
 * ASLI dari `GET /api/tenants` (diambil 28 Agustus 2026), bukan penampung
 * `HD-00x` seperti sebelumnya. Itu memperbaiki kerusakan data yang nyata dan
 * berulang, bukan sekadar kerapian:
 *
 * `opd.e2e-spec.ts` sengaja mengikat OPD_SOURCE ke stub ini lalu memanggil
 * endpoint sync SUNGGUHAN, dan jest-e2e memakai DATABASE YANG SAMA dengan dev.
 * Karena `OpdService.syncFromSource` mengadopsi baris ber-`kode` sama (agar tak
 * bentrok unik), setiap kali suite e2e dijalankan ia MENIMPA `external_id` tiga
 * OPD sungguhan dengan `HD-00x`. Suite itu sudah punya snapshot+restore untuk
 * `isActive`, tetapi `external_id` TIDAK pernah dipulihkan — jadi kerusakannya
 * menetap dan tak terlihat sampai ada yang memeriksa kolomnya.
 *
 * Akibatnya bukan kosmetik: pemetaan peran SSO mencocokkan klaim `groups`/`role`
 * ke `opd.external_id` atau `opd.kode`. Dengan nilai penampung, klaim yang
 * membawa UUID asli TIDAK cocok dan Admin OPD yang bersangkutan dibuatkan akun
 * `responden` — kegagalan yang senyap. Dengan nilai asli di bawah, menjalankan
 * e2e tak lagi merusak apa pun: yang ditulisnya sama dengan yang ditulis
 * sinkronisasi sungguhan.
 *
 * `DISDIK` DIHAPUS dari daftar ini (2026-08-28): Helpdesk memakai kode `DINDIK`
 * untuk "Dinas Pendidikan dan Kebudayaan". `DISDIK` tak pernah cocok dengan apa
 * pun dan hanya menghasilkan baris OPD hantu setiap kali sync stub berjalan.
 */
@Injectable()
export class StubOpdSource implements OpdSource {
  private readonly fixtures: HelpdeskOpd[] = [
    {
      externalId: 'e3152173-1ad7-424c-aed8-2cdf606a25c6',
      nama: 'Dinas Kesehatan',
      kode: 'DINKES',
      jenisLayanan: 'Kesehatan',
      penanggungJawab: 'Kepala Dinas Kesehatan',
      isActive: true,
    },
    {
      externalId: 'ee78aabd-83db-471a-b40e-c2fc89a56d5b',
      nama: 'Dinas Pendidikan dan Kebudayaan',
      kode: 'DINDIK',
      jenisLayanan: 'Pendidikan',
      penanggungJawab: 'Kepala Dinas Pendidikan dan Kebudayaan',
      isActive: true,
    },
    {
      externalId: 'd9e7d119-a598-41a8-b2fd-630e4a0c57cf',
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
