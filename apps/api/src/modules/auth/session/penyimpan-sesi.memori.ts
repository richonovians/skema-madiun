import { Injectable } from '@nestjs/common';
import type { CatatanSesi, PenyimpanSesi, SesiTerdaftar } from './penyimpan-sesi.interface';

/**
 * `PenyimpanSesi` dalam memori proses.
 *
 * UNTUK UJI DAN PENGEMBANGAN TANPA REDIS, bukan untuk produksi: isinya hilang
 * saat proses mati, dan dua proses API tidak saling melihat sesi satu sama lain,
 * sehingga sesi yang dicabut pada satu proses tetap hidup di proses lain.
 *
 * Kontraknya satu dengan implementasi Redis, dan keduanya diuji oleh berkas uji
 * yang sama. Perbedaan perilaku di antara keduanya adalah cacat.
 */
@Injectable()
export class PenyimpanSesiMemori implements PenyimpanSesi {
  private readonly sesi = new Map<string, CatatanSesi>();
  /** Indeks per akun, meniru SET Redis. Anggota basi dipangkas saat dibaca. */
  private readonly perAkun = new Map<number, Set<string>>();

  private static get sekarang(): number {
    return Math.floor(Date.now() / 1000);
  }

  async simpan(sid: string, catatan: CatatanSesi): Promise<void> {
    this.sesi.set(sid, catatan);
    const milik = this.perAkun.get(catatan.uid) ?? new Set<string>();
    milik.add(sid);
    this.perAkun.set(catatan.uid, milik);
  }

  async hidup(sid: string): Promise<boolean> {
    const catatan = this.sesi.get(sid);
    if (!catatan) return false;
    // Pagu mutlak diperiksa, bukan hanya keberadaan kuncinya. Di Redis hal ini
    // dikerjakan TTL; di sini tak ada yang mengerjakannya, dan tanpa
    // pemeriksaan ini sesi akan hidup selamanya di penyimpan sekalipun
    // tokennya sendiri sudah mati.
    if (catatan.abs <= PenyimpanSesiMemori.sekarang) {
      this.buang(sid, catatan.uid);
      return false;
    }
    return true;
  }

  async cabut(sid: string): Promise<void> {
    const catatan = this.sesi.get(sid);
    this.buang(sid, catatan?.uid);
  }

  async cabutSemua(uid: number): Promise<void> {
    for (const sid of this.perAkun.get(uid) ?? []) {
      this.sesi.delete(sid);
    }
    this.perAkun.delete(uid);
  }

  async daftar(uid: number): Promise<SesiTerdaftar[]> {
    const hasil: SesiTerdaftar[] = [];
    for (const sid of [...(this.perAkun.get(uid) ?? [])]) {
      const catatan = this.sesi.get(sid);
      if (!catatan || catatan.abs <= PenyimpanSesiMemori.sekarang) {
        this.buang(sid, uid);
        continue;
      }
      hasil.push({ sid, ...catatan });
    }
    return hasil;
  }

  private buang(sid: string, uid?: number): void {
    this.sesi.delete(sid);
    if (uid === undefined) return;
    const milik = this.perAkun.get(uid);
    if (!milik) return;
    milik.delete(sid);
    if (milik.size === 0) this.perAkun.delete(uid);
  }
}
