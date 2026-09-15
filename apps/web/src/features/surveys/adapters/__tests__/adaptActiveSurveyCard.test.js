import { adaptActiveSurveyCard } from '../survey.adapter';

/**
 * `isUtama` ikut diterjemahkan sejak 15 September 2026.
 *
 * Halaman sukses pengaduan mengenali survei utama OPD dari daftar survei aktif
 * -- tanpa endpoint baru. Adapter yang menjatuhkan penandanya membuat tombol
 * "Lanjut Isi Survei" selamanya jatuh ke daftar, dan itu terjadi TANPA satu pun
 * galat: backend mengirim penandanya dengan benar, komponennya membacanya
 * dengan benar, hanya terjemahan di antara keduanya yang kehilangan medan itu.
 */
describe('adaptActiveSurveyCard', () => {
  const mentah = (ekstra = {}) => ({
    id: 7,
    judul: 'Survei Layanan',
    opdNama: 'Dinas Lingkungan Hidup',
    questionsCount: 9,
    status: 'aktif',
    ...ekstra,
  });

  it('membawa penanda survei utama', () => {
    expect(adaptActiveSurveyCard(mentah({ isUtama: true })).isUtama).toBe(true);
  });

  it('KONTROL: survei biasa tidak ikut tertandai utama', () => {
    expect(adaptActiveSurveyCard(mentah({ isUtama: false })).isUtama).toBe(false);
  });

  /**
   * Backend lama -- atau tanggapan yang di-cache sebelum kolomnya ada -- tak
   * mengirim medan ini sama sekali. `undefined` tak boleh lolos sebagai nilai:
   * komponennya memilih survei dengan `.find((s) => s.isUtama)`, dan di sana
   * `undefined` memang jatuh ke cabang yang benar, tetapi medan bertipe tak
   * menentu akan menyeberang ke pembanding lain yang tidak.
   */
  it('tanpa medan itu, hasilnya false — bukan undefined', () => {
    expect(adaptActiveSurveyCard(mentah()).isUtama).toBe(false);
  });
});
