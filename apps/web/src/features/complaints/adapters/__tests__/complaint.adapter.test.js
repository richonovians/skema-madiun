import {
  adaptComplaint,
  adaptComplaintReplyToChatMessage,
  toCreateComplaintPayload,
} from '../complaint.adapter';

/**
 * Bentuk respons pengaduan ANONIM yang sebenarnya: backend MENGHILANGKAN
 * `userId` dan `reporterNama` sama sekali (bukan mengirimnya null), dan
 * `authorId` balasan pelapor pun ikut hilang. Fixture di sini meniru itu
 * dengan tidak menyertakan kuncinya, bukan dengan mengisi null.
 */
const entity = (over = {}) => ({
  id: 11,
  ticketNo: 'PGD20260904AAAA',
  opdId: 1,
  kategori: 'aduan',
  judul: 'Judul',
  uraian: 'Uraian',
  status: 'diterima',
  createdAt: '2026-09-04T02:00:00.000Z',
  attachments: [],
  isAnonim: false,
  ...over,
});

describe('adaptComplaint — pengaduan anonim', () => {
  it('menampilkan "Anonim" saat backend tak mengirim nama pelapor', () => {
    const hasil = adaptComplaint(entity({ isAnonim: true }));

    expect(hasil.isAnonim).toBe(true);
    expect(hasil.reporter.name).toBe('Anonim');
    expect(hasil.reporter.initials).toBe('AN');
  });

  it('pengaduan biasa tetap memakai nama pelapor (kontrol)', () => {
    const hasil = adaptComplaint(entity({ userId: 7, reporterNama: 'Siti Aminah' }));

    expect(hasil.isAnonim).toBe(false);
    expect(hasil.reporter.name).toBe('Siti Aminah');
    expect(hasil.userId).toBe(7);
  });
});

describe('adaptComplaintReplyToChatMessage — pengaduan anonim', () => {
  const balasanPelapor = { id: 1, pesan: 'dari pelapor', createdAt: '2026-09-04T02:00:00.000Z' };
  const balasanAdmin = {
    id: 2,
    authorId: 3,
    pesan: 'dari admin',
    createdAt: '2026-09-04T02:00:00.000Z',
  };

  it('balasan tanpa authorId pada pengaduan anonim = balasan pelapor, berlabel', () => {
    const hasil = adaptComplaintReplyToChatMessage(balasanPelapor, undefined, { isAnonim: true });

    expect(hasil.role).toBe('user');
    expect(hasil.senderName).toBe('Pelapor (anonim)');
  });

  it('balasan admin pada pengaduan anonim tetap dikenali admin', () => {
    const hasil = adaptComplaintReplyToChatMessage(balasanAdmin, undefined, { isAnonim: true });

    expect(hasil.role).toBe('admin');
    expect(hasil.senderName).toBe('Admin');
  });

  it('pengaduan biasa: pembandingan authorId lama tetap berlaku (kontrol)', () => {
    expect(adaptComplaintReplyToChatMessage({ ...balasanAdmin, authorId: 7 }, 7).role).toBe('user');
    expect(adaptComplaintReplyToChatMessage(balasanAdmin, 7).role).toBe('admin');
    expect(adaptComplaintReplyToChatMessage({ ...balasanAdmin, authorId: 7 }, 7).senderName).toBeUndefined();
  });
});

describe('toCreateComplaintPayload', () => {
  it('meneruskan flag anonim', () => {
    expect(
      toCreateComplaintPayload({
        opdId: '3',
        kategori: 'aduan',
        title: 'J',
        description: 'U',
        isAnonim: true,
      }),
    ).toEqual({ opdId: 3, kategori: 'aduan', judul: 'J', uraian: 'U', isAnonim: true });
  });

  it('tanpa flag -> false, bukan undefined', () => {
    expect(
      toCreateComplaintPayload({ opdId: '3', kategori: 'aduan', title: 'J', description: 'U' })
        .isAnonim,
    ).toBe(false);
  });
});
