import { JenisSurvei, MetodeNilai, SurveyStatus, TujuanSurvei } from '@prisma/client';
import { BaseEntity } from '../../../common/entities/base.entity';
import { NilaiSurveiEntity } from '../../ikm/entities/nilai-survei.entity';

export class SurveyEntity extends BaseEntity<SurveyEntity> {
  id: number;
  opdId: number;
  judul: string;
  periode: string;
  status: SurveyStatus;
  /**
   * Jenis survei (8 Oktober 2026): `skm_permenpanrb` berkerangka U1-U9 yang tak
   * dapat dihapus, `custom` bebas dan tanpa nilai IKM. Dipilih saat dibuat, tak
   * dapat diganti.
   */
  jenis: JenisSurvei;
  /**
   * Tujuan survei custom (8 Oktober 2026); `null` pada survei SKM. `null` pada
   * custom (baris lama/fixture) dibaca bawaan `kepuasan`.
   */
  tujuan: TujuanSurvei | null;
  /** Metode tampilan Nilai Survei; `null` pada SKM, pada custom dibaca `rata_rata`. */
  metodeNilai: MetodeNilai | null;
  allowMultipleSubmit: boolean;
  /** Survei ini boleh diisi tanpa sesi lewat /survei/:id. Baku false. */
  izinkanAnonim: boolean;
  /**
   * Survei utama OPD ini: tujuan tombol "Lanjut Isi Survei" pada halaman sukses
   * pengaduan. Paling banyak satu per OPD, ditegakkan indeks unik parsial.
   */
  isUtama: boolean;
  createdAt: Date;
  updatedAt: Date;
  /** Jumlah responden yang sudah mengisi. Hanya diisi pada `GET /surveys` (INT-9). */
  respondentsCount?: number;
  /** Nilai IKM live-compute (null bila belum ada unsur/responden). Hanya diisi pada `GET /surveys` (INT-9). */
  nilaiIkm?: number | null;
  /**
   * Rata-rata SEMUA jawaban skala (1-4) pada survei ini, atau `null` bila belum
   * ada jawaban skala (7 Oktober 2026). BEDA dari `nilaiIkm`: tetap terisi untuk
   * survei tanpa 9 unsur baku yang IKM-nya `null`. Diisi pada `GET /surveys` dan
   * `GET /surveys/:id`, bersama `nilaiIkm`.
   */
  nilaiRataRata?: number | null;
  /**
   * NILAI SURVEI siap tampil untuk survei `custom` (8 Oktober 2026), menurut
   * `tujuan` + `metodeNilai`. `null` pada survei SKM (yang punya `nilaiIkm`) dan
   * pada custom yang belum punya jawaban skala. Diisi bersama `nilaiRataRata`
   * pada `GET /surveys` dan `GET /surveys/:id`.
   */
  nilaiSurvei?: NilaiSurveiEntity | null;
  /**
   * Kapan respons TERAKHIR masuk ke survei ini, atau `null` bila belum ada satu
   * pun (4 Oktober 2026). Hanya diisi pada `GET /surveys/:id`.
   *
   * Ada di sini, bukan di meta daftar respons, karena layar ringkasan sudah
   * memanggil endpoint ini sekali untuk judul & periode -- sementara menaruhnya
   * di `PaginatedResult` menuntut bentuk meta SELURUH API ikut berubah.
   */
  terakhirMasuk?: Date | null;
  /** Nama OPD pemilik survei. Hanya diisi pada `GET /surveys/active` (INT-17). */
  opdNama?: string;
  /** Jumlah pertanyaan dalam survei. Hanya diisi pada `GET /surveys/active` (INT-17). */
  questionsCount?: number;
}
