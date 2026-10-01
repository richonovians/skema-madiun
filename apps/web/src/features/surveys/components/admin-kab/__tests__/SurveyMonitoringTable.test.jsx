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
const survei = (id, title, status) => ({
  id: String(id),
  title,
  status,
  period: '2026-Q3',
  opdName: 'Dinas Contoh',
  respondentsCount: 0,
  ikmScore: null,
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
