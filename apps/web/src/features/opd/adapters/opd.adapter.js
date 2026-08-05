/**
 * Terjemahkan OpdEntity backend (GET /opd) ke bentuk yang dipakai komponen
 * (lihat features/opd/constants/dummyOPD.js). Satu tempat -- perubahan kontrak
 * backend cukup diubah di sini (INT-6).
 *
 * CATATAN GAP: `address` dipakai beberapa komponen dummy tapi TIDAK ADA di backend
 * (OPD adalah cache read-only dari Helpdesk, lihat keputusan D7 di
 * docs/Rencana-Integrasi-Frontend-Backend.md) -- field ini sengaja TIDAK diisi
 * (undefined), komponen yang menampilkannya perlu disesuaikan (hapus tampilan),
 * bukan tugas adapter memalsukan data yang memang tak ada.
 */
export function adaptOpd(opd) {
  return {
    id: opd.id,
    code: opd.kode,
    name: opd.nama,
    serviceType: opd.jenisLayanan,
    activeSurveys: opd.activeSurveys ?? 0,
    openComplaints: opd.openComplaints ?? 0,
    status: opd.isActive ? 'ACTIVE' : 'INACTIVE',
    // Kapan cache lokal ini terakhir disinkron dari Helpdesk -- satu-satunya
    // "aksi" nyata yang tersedia utk baris OPD (lihat OPDTable.jsx: tak ada
    // endpoint aktifkan/nonaktifkan manual, OPD murni cache read-only, D10).
    syncedAt: opd.syncedAt ?? null,
  };
}

export function adaptOpdList(opdList) {
  return opdList.map(adaptOpd);
}
