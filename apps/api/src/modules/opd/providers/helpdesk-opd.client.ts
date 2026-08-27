import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HelpdeskOpd, OpdSource } from '../interfaces/opd-source.interface';

/** Bentuk satu "tenant" Helpdesk (`GET /api/tenants`) -- superset field, bukan seluruhnya dipakai. */
interface HelpdeskTenant {
  id: string;
  name: string;
  type: string;
  description: string;
}

interface HelpdeskTenantsResponse {
  success: boolean;
  message: string;
  data: HelpdeskTenant[];
}

const KODE_MAX_LENGTH = 10;

/**
 * Tenant `type: "dinas"` yang namanya berawalan "BAGIAN" (2026-08-25, permintaan
 * user). Diperiksa pada `name` dengan `\b` supaya "BAGIANKU" (bila kelak muncul)
 * tak ikut tertangkap.
 */
const BAGIAN_NAME_PREFIX = /^BAGIAN\b/i;

/**
 * Implementasi NYATA `OpdSource` — Helpdesk `GET /api/tenants` (dikonfirmasi contoh
 * respons 2026-08-05). Struktur data Helpdesk berjenjang (`gov` > `bidang` > `sesi`,
 * plus jenis campuran `dinas`).
 *
 * YANG DIPAKAI (diverifikasi ulang terhadap respons nyata 2026-08-25 — 117 tenant:
 * gov 53, dinas 50, bidang 8, sesi 6):
 *
 * 1. SELURUH `type: "gov"` (53) — roster OPD resmi: 30 dinas/badan/RSUD/Setda/
 *    Inspektorat/Satpol PP + 15 kecamatan + 8 kelurahan. Punya `description` berisi
 *    singkatan baku (DINKES, DLH, DISPERKIM, ...).
 * 2. `type: "dinas"` yang namanya berawalan "BAGIAN" (9) — permintaan user
 *    2026-08-25. Ini bagian-bagian Sekretariat Daerah (Hukum, Umum, Organisasi,
 *    Pemerintahan, Pengadaan Barang/Jasa, Perekonomian & SDA, Protokol & Komunikasi
 *    Pimpinan, Kesejahteraan Rakyat, Administrasi Pembangunan). SETDA sendiri sudah
 *    ada sebagai satu baris `gov`, jadi sembilan baris ini MEMPERINCI di bawahnya.
 *
 * 41 SISA `type: "dinas"` SENGAJA DIBUANG, dan alasannya diperiksa bukan diwarisi:
 * ~9 di antaranya entitas yang SAMA dengan baris `gov` tapi bernama ALL-CAPS &
 * berejaan beda (mis. "DINAS PERUMAHAN DAN KAWASAN PERMUKIMAN" vs `gov` "Dinas
 * Perumahan dan Kawasan Pemukiman"/DISPERKIM) — memasukkannya berarti dua baris OPD
 * untuk satu instansi. Sisanya sub-unit hasil sinkron ASN: SDN, SMPN, TK, 13 UPT
 * Puskesmas, dan kelurahan yang sudah terwakili di `gov`.
 *
 * CATATAN PENTING soal `kode`: skema lokal (`Opd.kode`) WAJIB unik & maks 10 karakter,
 * tapi Helpdesk TIDAK punya field kode/singkatan baku. `description` pada tenant
 * `gov` SERING (bukan selalu) berisi singkatan pendek yg cocok (mis. "DISKOMINFO",
 * "DINKES") -- tapi PALING TIDAK 4 kasus nyata melebihi 10 karakter
 * (KESBANGPOLDAGRI, INSPEKTORAT, "RSUD CARUBAN", "RSUD DOLOPO") dan SELURUH
 * kecamatan/kelurahan py `description` KOSONG. Kesembilan baris "BAGIAN" pun
 * `description`-nya kosong SEMUA, jadi kodenya selalu hasil derivasi dari nama:
 * BAGIANHUKU, BAGIANPENG, BAGIANORGA, BAGIANPERE, BAGIANUMUM, BAGIANPEME,
 * BAGIANPROT, BAGIANKESE, BAGIANADMI -- kesembilannya unik pada 10 karakter
 * pertama, jadi tak ada yang butuh angka pembeda. `deriveKode` di bawah menangani
 * fallback dari `name` + jaminan unik DALAM SATU PANGGILAN (Set) -- BUKAN dari
 * karangan, murni derivasi deterministik dari data asli yg sudah dikonfirmasi via
 * pengecekan manual seluruh respons nyata (tak ada tabrakan pada data saat ini,
 * fallback penambah angka tetap ada utk jaga-jaga).
 */
@Injectable()
export class HelpdeskOpdClient implements OpdSource {
  private readonly logger = new Logger(HelpdeskOpdClient.name);

  constructor(private readonly config: ConfigService) {}

  async fetchOpdList(): Promise<HelpdeskOpd[]> {
    const url = this.config.get<string>('helpdesk.opdApiUrl');
    const token = this.config.get<string>('helpdesk.opdApiToken');
    if (!url || !token) {
      throw new Error('HELPDESK_OPD_API_URL / HELPDESK_OPD_API_TOKEN belum diisi di environment');
    }

    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      throw new Error(`Helpdesk API membalas ${res.status} ${res.statusText}`);
    }

    const body = (await res.json()) as HelpdeskTenantsResponse;
    if (!body.success) {
      throw new Error(`Helpdesk API gagal: ${body.message}`);
    }

    // `gov` TETAP disertakan. Menyaring HANYA "BAGIAN" akan membuat
    // `OpdService.syncFromSource` menonaktifkan seluruh 53 OPD `gov` (ia
    // menonaktifkan setiap baris ber-externalId yang hilang dari source), dan
    // survei serta pengaduan yang ada merujuk ke baris-baris itu.
    const govTenants = body.data.filter((t) => t.type === 'gov');
    const bagianTenants = body.data.filter(
      (t) => t.type === 'dinas' && BAGIAN_NAME_PREFIX.test(t.name.trim()),
    );
    const usedKodes = new Set<string>();

    const items = [...govTenants, ...bagianTenants].map((t): HelpdeskOpd => ({
      externalId: t.id,
      nama: t.name,
      kode: this.deriveKode(t.name, t.description, usedKodes),
      isActive: true,
    }));

    this.logger.log(
      `Ambil ${body.data.length} tenant Helpdesk: ${govTenants.length} bertipe "gov" + ` +
        `${bagianTenants.length} bertipe "dinas" berawalan "BAGIAN" = ${items.length} OPD`,
    );
    return items;
  }

  /**
   * `description` (kalau muat & tak kosong) jadi kode; else derivasi dari `name`
   * (KECAMATAN/KELURAHAN disingkat KEC/KEL biar tak langsung kepotong). Tabrakan
   * DALAM SATU PANGGILAN ini (mis. dua Kelurahan Bangunsari beda kecamatan)
   * ditangani nomor urut di ekor, bukan dibiarkan gagal upsert.
   */
  private deriveKode(nama: string, description: string, usedKodes: Set<string>): string {
    const fromDescription = description
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
    const base = (
      fromDescription.length > 0 && fromDescription.length <= KODE_MAX_LENGTH
        ? fromDescription
        : this.slugifyName(nama)
    ).slice(0, KODE_MAX_LENGTH);

    let candidate = base || 'OPD';
    let suffix = 1;
    while (usedKodes.has(candidate)) {
      const suffixStr = String(suffix);
      candidate = base.slice(0, KODE_MAX_LENGTH - suffixStr.length) + suffixStr;
      suffix += 1;
    }
    usedKodes.add(candidate);
    return candidate;
  }

  private slugifyName(nama: string): string {
    return nama
      .toUpperCase()
      .replace(/^KECAMATAN\s+/, 'KEC')
      .replace(/^KELURAHAN\s+/, 'KEL')
      .replace(/[^A-Z0-9]/g, '');
  }
}
