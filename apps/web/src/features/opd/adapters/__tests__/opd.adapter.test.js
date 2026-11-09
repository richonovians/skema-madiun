import { adaptOpd } from '../opd.adapter';

const dasar = {
  id: 7,
  kode: 'DINKES',
  nama: 'Dinas Kesehatan',
  jenisLayanan: null,
  tingkat: 'kabupaten',
  isActive: true,
  syncedAt: null,
};

/**
 * Agregat INT-10 tidak dikarang adapter (9 November 2026).
 *
 * Sejak `GET /opd` hanya mengirim `activeSurveys`, `openComplaints`, dan
 * `adminCount` kepada peran berakses penuh, ketiadaan medan itu adalah keadaan
 * biasa bagi Admin OPD dan responden. `?? 0` mengubah "tidak dikirim" menjadi
 * klaim "nol survei aktif, nol pengaduan terbuka" yang tak pernah dibuat
 * backend.
 */
describe('adaptOpd -- agregat', () => {
  it('medan yang tidak dikirim menjadi null, bukan 0', () => {
    const hasil = adaptOpd(dasar);

    expect(hasil.activeSurveys).toBeNull();
    expect(hasil.openComplaints).toBeNull();
    expect(hasil.adminCount).toBeNull();
  });

  it('nol yang sungguhan dari backend tetap nol', () => {
    const hasil = adaptOpd({ ...dasar, activeSurveys: 0, openComplaints: 0, adminCount: 0 });

    expect(hasil.activeSurveys).toBe(0);
    expect(hasil.openComplaints).toBe(0);
    expect(hasil.adminCount).toBe(0);
  });

  it('angka dari backend diteruskan apa adanya', () => {
    const hasil = adaptOpd({ ...dasar, activeSurveys: 3, openComplaints: 5, adminCount: 2 });

    expect(hasil).toMatchObject({ activeSurveys: 3, openComplaints: 5, adminCount: 2 });
  });
});
