/** Bentuk data OPD dari sumber Helpdesk (satu record). */
export interface HelpdeskOpd {
  externalId: string;
  nama: string;
  kode: string;
  jenisLayanan?: string;
  penanggungJawab?: string;
  isActive?: boolean;
}

/**
 * Kontrak sumber data OPD — batas abstraksi (seam) integrasi Helpdesk.
 * Implementasi: `StubOpdSource` (dev) sekarang; `HelpdeskOpdClient` (HTTP) nanti.
 * Logika sinkronisasi (OPD-3) hanya bergantung pada kontrak ini, bukan detail HTTP,
 * sehingga endpoint API Helpdesk dapat diganti tanpa mengubah business logic.
 */
export interface OpdSource {
  fetchOpdList(): Promise<HelpdeskOpd[]>;
}
