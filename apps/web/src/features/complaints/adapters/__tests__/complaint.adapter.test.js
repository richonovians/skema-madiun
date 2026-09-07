import {
  adaptComplaint,
  adaptComplaintAttachment,
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

/**
 * Sejak T1 ditutup (7 September 2026), `fileUrl` dari backend membawa tanda
 * tangan: `/uploads/complaints/<uuid>-foto.png?exp=...&sig=...`.
 *
 * `url` memang harus memuat kueri itu utuh -- tanpanya gambar dijawab 403. Yang
 * TIDAK boleh memuatnya adalah `alt`: ia diambil dari potongan terakhir jalur,
 * jadi tanpa perbaikan ini teks alternatif setiap lampiran berbunyi
 * "foto.png?exp=1764000000&sig=aB3..." -- terbaca lantang oleh pembaca layar,
 * dan ikut tampil di mana pun nama berkas ditampilkan.
 */
describe('adaptComplaintAttachment', () => {
  const lampiran = {
    id: 3,
    fileUrl: '/uploads/complaints/8a7b-foto.png?exp=1764000000&sig=aB3_x-9',
    mimeType: 'image/png',
    sizeBytes: 1024,
  };

  it('url membawa tanda tangannya utuh', () => {
    // Memotong kueri di sini berarti setiap gambar dijawab 403.
    expect(adaptComplaintAttachment(lampiran).url).toContain('?exp=1764000000&sig=aB3_x-9');
  });

  it('alt hanya nama berkas, TANPA kueri tanda tangan', () => {
    expect(adaptComplaintAttachment(lampiran).alt).toBe('8a7b-foto.png');
  });

  it('awalan UUID dibuang dari nama yang ditampilkan & diunduh', () => {
    // Backend menyimpan berkas sebagai `<uuid>-<nama asli>` supaya dua unggahan
    // bernama sama tak saling menimpa. UUID itu urusan penyimpanan, bukan nama
    // yang layak dibaca pengguna -- dan sejak tombol unduh benar-benar bekerja
    // (7 September 2026) nama inilah yang tersimpan di komputer mereka.
    const hasil = adaptComplaintAttachment({
      ...lampiran,
      fileUrl:
        '/uploads/complaints/e6874b87-de62-4667-95e8-67b81584086d-Probis_Pengaduan.png?exp=1&sig=z',
    });

    expect(hasil.alt).toBe('Probis_Pengaduan.png');
  });

  it('nama yang KEBETULAN berawalan mirip-UUID tak dipangkas keliru', () => {
    // Kontrol: pemangkasnya harus mengikat bentuk UUID persis, bukan "ada tanda
    // hubung di depan". Tanpa kontrol ini, `laporan-2026-buku.png` bisa ikut
    // terpotong dan penggunanya kehilangan nama berkasnya.
    const hasil = adaptComplaintAttachment({
      ...lampiran,
      fileUrl: '/uploads/complaints/laporan-2026-buku.png',
    });

    expect(hasil.alt).toBe('laporan-2026-buku.png');
  });

  it('fileUrl tanpa kueri tetap bekerja', () => {
    // Balasan lama / data uji bisa saja belum bertanda tangan.
    const hasil = adaptComplaintAttachment({ ...lampiran, fileUrl: '/uploads/complaints/a.png' });
    expect(hasil.alt).toBe('a.png');
  });
});
