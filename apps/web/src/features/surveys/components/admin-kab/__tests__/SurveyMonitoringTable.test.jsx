import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import SurveyMonitoringTable from '../SurveyMonitoringTable';

/**
 * AKSI BARIS MENJADI MENU TITIK-TIGA (30 September 2026, permintaan pengguna:
 * "kolom aksi di survei kabupaten, buat menu titik tiga seperti di manajemen
 * user kabupaten").
 *
 * Sebelumnya satu baris memuat SAMPAI SEPULUH tombol lepas ber-`flex-wrap`
 * dengan `min-w-[230px]` -- penyakit yang sama persis dengan Manajemen User
 * sebelum 28 September. Komponennya sudah generik (`components/ui/RowActionsMenu`),
 * jadi ini pemakaian ulang, bukan komponen baru.
 *
 * DUA HAL BERUBAH BENTUK, BUKAN BERUBAH ATURAN, dan keduanya dijaga di bawah:
 *
 * 1. "Ubah" pada survei DITUTUP dulu memakai atribut `title` -- tooltip yang
 *    tak terbaca pembaca layar dan tak pernah muncul pada sentuh. RowActionsMenu
 *    sudah punya `disabled` + `keterangan`, jadi alasannya menjadi teks.
 * 2. "Bagikan" dulu komponen `ShareSurveyButton` yang membawa tombolnya sendiri.
 *    Di dalam menu ia tak bisa membawa tombol, jadi modalnya diangkat ke tabel:
 *    butir menu menyetel state, `ShareSurveyModal` dirender sekali.
 *
 * Aturan status TIDAK bergeser sedikit pun -- itulah sebabnya berkas ini
 * memeriksa ketiga status untuk hampir setiap aksi.
 */
const survei = (id, title, status, extra = {}) => ({
  id: String(id),
  title,
  status,
  period: '2026-Q3',
  opdName: 'Dinas Contoh',
  respondentsCount: 0,
  ikmScore: null,
  isUtama: false,
  ...extra,
});

const render1 = (surveys, props = {}) =>
  render(
    <SurveyMonitoringTable
      surveys={surveys}
      onEdit={jest.fn()}
      onPublish={jest.fn()}
      onClose={jest.fn()}
      onReopen={jest.fn()}
      onDelete={jest.fn()}
      onDuplicate={jest.fn()}
      onJadikanUtama={jest.fn()}
      {...props}
    />,
  );

/** Baris dicari lewat judulnya supaya asersinya tak bergantung pada urutan. */
const baris = (judul) => screen.getByText(judul).closest('tr');

/**
 * Menu digambar lewat portal ke `document.body`, jadi ia TIDAK berada di dalam
 * `<tr>`. Tombolnya dicari di dalam baris; panelnya di seluruh dokumen.
 */
function bukaMenu(judul) {
  fireEvent.click(within(baris(judul)).getByRole('button', { name: /aksi untuk/i }));
  return screen.getByRole('menu');
}

describe('SurveyMonitoringTable — kolom aksi sebagai menu titik-tiga', () => {
  it('kolom aksi hanya memuat SATU tombol per baris', () => {
    render1([survei(1, 'Survei Aktif', 'AKTIF')]);

    expect(within(baris('Survei Aktif')).getAllByRole('button')).toHaveLength(1);
  });

  it('nama tombolnya menyebut survei pemilik barisnya', () => {
    // Pada daftar panjang akan ada belasan tombol berfungsi sama; nama yang
    // identik membuat pembaca layar tak dapat membedakannya.
    render1([survei(1, 'Survei Aktif', 'AKTIF'), survei(2, 'Survei Draf', 'DRAF')]);

    expect(screen.getByRole('button', { name: /aksi untuk Survei Aktif/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /aksi untuk Survei Draf/i })).toBeInTheDocument();
  });

  it('menunya tertutup secara baku', () => {
    render1([survei(1, 'Survei Aktif', 'AKTIF')]);

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});

describe('SurveyMonitoringTable — isi menu mengikuti status', () => {
  it('DRAF: Publikasikan & Pertanyaan ada, Respons & Aktifkan tidak', () => {
    render1([survei(1, 'Survei Draf', 'DRAF')]);
    const menu = within(bukaMenu('Survei Draf'));

    expect(menu.getByRole('menuitem', { name: /publikasikan/i })).toBeInTheDocument();
    expect(menu.getByRole('menuitem', { name: /pertanyaan/i })).toBeInTheDocument();
    expect(menu.queryByRole('menuitem', { name: /respons/i })).not.toBeInTheDocument();
    expect(menu.queryByRole('menuitem', { name: /^Aktifkan$/ })).not.toBeInTheDocument();
  });

  /**
   * TUTUP TIDAK MUNCUL PADA DRAF (1 Oktober 2026, permintaan pengguna).
   *
   * Syaratnya dulu `(isDraft || isActive)`, dan backend memang MENGIZINKAN
   * transisi draft -> ditutup (ALLOWED_TRANSITIONS di surveys.service.ts).
   * Yang dipersempit karena itu TAMPILANNYA saja: menutup survei yang belum
   * pernah dibuka tak menutup apa pun, sebab tak ada periode yang berjalan
   * untuk diakhiri. Pagar backend sengaja tak disentuh -- jalur penghapusan ke
   * Sampah ikut memakainya.
   */
  it('DRAF: Tutup TIDAK ditawarkan', () => {
    render1([survei(1, 'Survei Draf', 'DRAF')]);

    expect(
      within(bukaMenu('Survei Draf')).queryByRole('menuitem', { name: /^Tutup$/ }),
    ).not.toBeInTheDocument();
  });

  it('AKTIF: Respons, Tutup & Bagikan ada, Publikasikan tidak', () => {
    render1([survei(1, 'Survei Aktif', 'AKTIF')]);
    const menu = within(bukaMenu('Survei Aktif'));

    expect(menu.getByRole('menuitem', { name: /respons/i })).toBeInTheDocument();
    expect(menu.getByRole('menuitem', { name: /tutup/i })).toBeInTheDocument();
    expect(menu.getByRole('menuitem', { name: /bagikan/i })).toBeInTheDocument();
    expect(menu.queryByRole('menuitem', { name: /publikasikan/i })).not.toBeInTheDocument();
  });

  it('DITUTUP: Aktifkan ada; Pertanyaan & Bagikan tidak', () => {
    render1([survei(1, 'Survei Ditutup', 'DITUTUP')]);
    const menu = within(bukaMenu('Survei Ditutup'));

    // Pola ketat: keterangan butir 'Ubah' memuat kata yang sama, dan ia ikut
    // masuk ke nama aksesibel butirnya -- justru bukti keterangan itu terbaca.
    expect(menu.getByRole('menuitem', { name: /^Aktifkan$/ })).toBeInTheDocument();
    expect(menu.queryByRole('menuitem', { name: /pertanyaan/i })).not.toBeInTheDocument();
    expect(menu.queryByRole('menuitem', { name: /bagikan/i })).not.toBeInTheDocument();
  });

  it('Bagikan hanya pada AKTIF, dipagari PER BARIS', () => {
    // Ketiga status dalam satu tabel: pemagaran yang keliru memakai status
    // baris pertama untuk seluruh tabel akan lolos uji per-status di atas.
    render1([
      survei(1, 'Survei Aktif', 'AKTIF'),
      survei(2, 'Survei Draf', 'DRAF'),
      survei(3, 'Survei Ditutup', 'DITUTUP'),
    ]);

    expect(
      within(bukaMenu('Survei Draf')).queryByRole('menuitem', { name: /bagikan/i }),
    ).not.toBeInTheDocument();
  });

  it('Detail & Salin ada pada ketiga status', () => {
    // KONTROL. Tanpa ini, menghilangkan menunya sama sekali akan membuat setiap
    // uji "tidak ada" di atas hijau selamanya.
    for (const [judul, status] of [
      ['Survei Aktif', 'AKTIF'],
      ['Survei Draf', 'DRAF'],
      ['Survei Ditutup', 'DITUTUP'],
    ]) {
      const { unmount } = render1([survei(1, judul, status)]);
      const menu = within(bukaMenu(judul));

      expect(menu.getByRole('menuitem', { name: /detail/i })).toBeInTheDocument();
      expect(menu.getByRole('menuitem', { name: /salin/i })).toBeInTheDocument();
      unmount();
    }
  });
});

describe('SurveyMonitoringTable — aksi memanggil penanganya', () => {
  it('Hapus meneruskan baris yang dipilih', () => {
    const onDelete = jest.fn();
    render1([survei(7, 'Survei Aktif', 'AKTIF')], { onDelete });

    fireEvent.click(within(bukaMenu('Survei Aktif')).getByRole('menuitem', { name: /hapus/i }));

    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: '7' }));
  });

  it('Publikasikan meneruskan baris yang dipilih', () => {
    const onPublish = jest.fn();
    render1([survei(8, 'Survei Draf', 'DRAF')], { onPublish });

    fireEvent.click(
      within(bukaMenu('Survei Draf')).getByRole('menuitem', { name: /publikasikan/i }),
    );

    expect(onPublish).toHaveBeenCalledWith(expect.objectContaining({ id: '8' }));
  });

  it('Ubah pada survei DITUTUP dimatikan, dengan ALASAN yang terbaca', () => {
    const onEdit = jest.fn();
    render1([survei(9, 'Survei Ditutup', 'DITUTUP')], { onEdit });
    const menu = within(bukaMenu('Survei Ditutup'));

    const ubah = menu.getByRole('menuitem', { name: /ubah/i });
    expect(ubah).toBeDisabled();
    expect(menu.getByText(/aktifkan kembali lebih dulu/i)).toBeInTheDocument();

    fireEvent.click(ubah);
    expect(onEdit).not.toHaveBeenCalled();
  });

  it('baris yang sedang sibuk mematikan aksi yang mengubah data', () => {
    render1([survei(5, 'Survei Aktif', 'AKTIF')], { busySurveyId: '5' });
    const menu = within(bukaMenu('Survei Aktif'));

    expect(menu.getByRole('menuitem', { name: /hapus/i })).toBeDisabled();
    expect(menu.getByRole('menuitem', { name: /salin/i })).toBeDisabled();
    // Detail hanya membaca, jadi ia tetap hidup: mengunci jalan keluar sebuah
    // baris selagi aksinya berjalan tak melindungi apa pun.
    expect(menu.getByRole('menuitem', { name: /detail/i })).not.toBeDisabled();
  });
});

/**
 * KOLOM NILAI SURVEI (8 Oktober 2026, permintaan pengguna: "ubah nama kolom nilai
 * rata rata menjadi nilai survei, dan untuk survei skm nilai survei berarti
 * kosong"). Dulu "NILAI RATA-RATA" (7 Oktober 2026): rata-rata polos semua
 * jawaban skala. Kini kolom Nilai Survei: hanya survei CUSTOM yang berisi (dari
 * backend), survei SKM "-" karena punya kolom NILAI IKM sendiri. Pengujian
 * lengkapnya di SurveyMonitoringTableJenis dan SurveyMonitoringTableNilaiSurvei;
 * di sini hanya yang menjaga bentuk dasar tabel.
 */
describe('SurveyMonitoringTable — kolom nilai survei', () => {
  it('kepala kolom NILAI SURVEI berada tepat di samping NILAI IKM', () => {
    render1([survei(1, 'Survei Aktif', 'AKTIF')]);

    const kepala = screen.getAllByRole('columnheader').map((th) => th.textContent);

    expect(kepala).toContain('NILAI IKM');
    expect(kepala).toContain('NILAI SURVEI');
    expect(kepala).not.toContain('NILAI RATA-RATA');
    expect(kepala.indexOf('NILAI SURVEI')).toBe(kepala.indexOf('NILAI IKM') + 1);
  });

  it('rata-rata polos TIDAK lagi tampil pada survei tanpa Nilai Survei', () => {
    render1([survei(1, 'Survei Aktif', 'AKTIF', { ikmScore: null, averageScore: 3.84 })]);

    expect(within(baris('Survei Aktif')).queryByText('3.84')).toBeNull();
  });

  it('belum ada jawaban skala -> "-", BUKAN 0.00', () => {
    // 0,00 terbaca sebagai hasil ukur terburuk; skala dimulai dari 1.
    render1([survei(1, 'Survei Draf', 'DRAF', { ikmScore: null, averageScore: null })]);
    const sel = within(baris('Survei Draf'));

    expect(sel.queryByText('0.00')).toBeNull();
    expect(sel.getAllByText('-').length).toBeGreaterThanOrEqual(2);
  });

  it('baris "tidak ada survei" melintasi SELURUH kolom, termasuk yang baru', () => {
    // colSpan yang tak ikut bertambah meninggalkan satu sel kosong di kanan.
    const { container } = render1([]);

    const jumlahKolom = container.querySelectorAll('thead th').length;

    expect(container.querySelector('tbody td[colspan]')).toHaveAttribute(
      'colspan',
      String(jumlahKolom),
    );
  });
});

describe('SurveyMonitoringTable — survei utama (7 Oktober 2026)', () => {
  it('menampilkan lencana "Survei Utama" hanya pada baris yang utama', () => {
    // Judul sengaja TANPA kata "utama" supaya /survei utama/i hanya cocok dengan
    // lencananya, bukan dengan teks judulnya.
    render1([
      survei(1, 'Survei Andalan', 'AKTIF', { isUtama: true }),
      survei(2, 'Survei Biasa', 'AKTIF'),
    ]);

    expect(within(baris('Survei Andalan')).getByText(/survei utama/i)).toBeInTheDocument();
    expect(within(baris('Survei Biasa')).queryByText(/survei utama/i)).not.toBeInTheDocument();
  });

  it('"Jadikan Utama" ditawarkan pada DRAF & AKTIF yang belum utama', () => {
    for (const status of ['DRAF', 'AKTIF']) {
      const { unmount } = render1([survei(1, `Survei ${status}`, status)]);

      expect(
        within(bukaMenu(`Survei ${status}`)).getByRole('menuitem', { name: /jadikan utama/i }),
      ).toBeInTheDocument();
      unmount();
    }
  });

  it('"Jadikan Utama" TIDAK ditawarkan pada survei DITUTUP (ditolak backend)', () => {
    render1([survei(1, 'Survei Ditutup', 'DITUTUP')]);

    expect(
      within(bukaMenu('Survei Ditutup')).queryByRole('menuitem', { name: /jadikan utama/i }),
    ).not.toBeInTheDocument();
  });

  it('"Jadikan Utama" TIDAK ditawarkan pada survei yang SUDAH utama', () => {
    // Lencana sudah menandainya; menunjuk ulang survei yang sama tak berarti.
    render1([survei(1, 'Survei Sudah Utama', 'AKTIF', { isUtama: true })]);

    expect(
      within(bukaMenu('Survei Sudah Utama')).queryByRole('menuitem', { name: /jadikan utama/i }),
    ).not.toBeInTheDocument();
  });

  it('memilih "Jadikan Utama" meneruskan baris yang dipilih', () => {
    const onJadikanUtama = jest.fn();
    render1([survei(12, 'Survei Aktif', 'AKTIF')], { onJadikanUtama });

    fireEvent.click(
      within(bukaMenu('Survei Aktif')).getByRole('menuitem', { name: /jadikan utama/i }),
    );

    expect(onJadikanUtama).toHaveBeenCalledWith(expect.objectContaining({ id: '12' }));
  });

  it('"Jadikan Utama" dipagari PER BARIS, bukan oleh status baris pertama', () => {
    // Baris pertama utama (butirnya hilang), baris kedua belum (butirnya ada).
    // Pemagaran yang keliru memakai satu baris untuk seluruh tabel akan lolos
    // uji per-baris di atas.
    render1([
      survei(1, 'Sudah Utama', 'AKTIF', { isUtama: true }),
      survei(2, 'Belum Utama', 'AKTIF'),
    ]);

    expect(
      within(bukaMenu('Belum Utama')).getByRole('menuitem', { name: /jadikan utama/i }),
    ).toBeInTheDocument();
  });
});
