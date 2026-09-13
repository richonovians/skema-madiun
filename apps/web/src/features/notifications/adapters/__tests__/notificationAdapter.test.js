import { adaptNotification } from '../notification.adapter';

/**
 * `createdAt` sempat dibuang adapter, hanya menyisakan `timeLabel` yang sudah
 * berupa kalimat ("Kemarin", "18 Agu 2026"). Pengelompokan per tanggal tak
 * mungkin dibangun di atas kalimat itu tanpa menguraikannya kembali -- jalan
 * yang jelas keliru. Uji ini menjaga sumbernya tetap ikut.
 */
describe('adaptNotification', () => {
  const mentah = {
    id: 7,
    type: 'complaint_reply',
    title: 'Balasan Baru pada Pengaduan',
    message: 'Ada balasan baru',
    link: '/complaints/PGD1',
    isRead: false,
    createdAt: '2026-09-13T08:00:00.000Z',
  };

  it('meneruskan waktu mentah, bukan hanya labelnya', () => {
    expect(adaptNotification(mentah).createdAt).toBe('2026-09-13T08:00:00.000Z');
  });

  it('label waktu tetap dihitung seperti sebelumnya', () => {
    expect(adaptNotification(mentah).timeLabel).toMatch(/\S/);
  });

  it('jenis tetap diteruskan -- dipakai memilih ikon barisnya', () => {
    expect(adaptNotification(mentah).type).toBe('complaint_reply');
  });
});
