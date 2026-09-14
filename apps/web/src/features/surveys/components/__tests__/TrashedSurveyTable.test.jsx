import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import TrashedSurveyTable from '../TrashedSurveyTable';

/**
 * Tabel halaman Sampah (11 September 2026). Dipakai KEDUA peran; yang berbeda
 * hanya kolom OPD (Kabupaten lintas instansi) dan tombol Hapus Permanen (hanya
 * Kabupaten).
 *
 * DUA SUSUNAN dalam satu komponen: tabel untuk layar lebar, daftar kartu untuk
 * ponsel. Keduanya ada di DOM sekaligus dan dipilih CSS (`md:hidden` /
 * `hidden md:block`), jadi uji di bawah menyasar salah satunya dengan
 * `within(tabel())` atau `within(kartu())` -- pencarian global akan menemukan
 * teks yang sama dua kali.
 *
 * `id` berupa string, mengikuti `adaptSurvey`/`adaptTrashedSurvey`.
 */
const tabel = () => document.querySelector('[data-susunan="tabel"]');
const kartu = () => document.querySelector('[data-susunan="kartu"]');
const baris = (over = {}) => ({
  id: '91',
  title: 'Survei IKM 2026',
  period: '2026-Q2',
  status: 'DITUTUP',
  opdName: 'Dinas Kesehatan',
  deletedAt: '2026-09-10T02:00:00.000Z',
  deletedByName: 'Admin Kabupaten',
  responsesCount: 12,
  ...over,
});

describe('TrashedSurveyTable', () => {
  it('menampilkan siapa yang membuang & berapa jawaban yang ikut', () => {
    render(<TrashedSurveyTable rows={[baris()]} />);
    const t = within(tabel());

    expect(t.getByText('Survei IKM 2026')).toBeInTheDocument();
    expect(t.getByText('Admin Kabupaten')).toBeInTheDocument();
    expect(t.getByText('12')).toBeInTheDocument();
  });

  it('akun pembuang yang sudah dihapus ditulis apa adanya', () => {
    // FK-nya ON DELETE SET NULL. Menuliskan "-" tanpa keterangan membuat
    // pembacanya mengira datanya gagal dimuat.
    render(<TrashedSurveyTable rows={[baris({ deletedByName: null })]} />);

    expect(within(tabel()).getByText(/akun sudah dihapus/i)).toBeInTheDocument();
    expect(within(kartu()).getByText(/akun sudah dihapus/i)).toBeInTheDocument();
  });

  it('kolom OPD hanya muncul bila diminta', () => {
    // Admin OPD hanya melihat sampah miliknya sendiri, jadi satu kolom berisi
    // nama instansinya sendiri berulang-ulang tak menambah apa pun.
    const { rerender } = render(<TrashedSurveyTable rows={[baris()]} tampilkanKolomOpd={false} />);
    expect(screen.queryByText('Dinas Kesehatan')).not.toBeInTheDocument();

    rerender(<TrashedSurveyTable rows={[baris()]} tampilkanKolomOpd />);
    expect(within(tabel()).getByText('Dinas Kesehatan')).toBeInTheDocument();
    expect(within(kartu()).getByText('Dinas Kesehatan')).toBeInTheDocument();
  });

  it('tombol Hapus Permanen hanya muncul bila diizinkan', () => {
    const { rerender } = render(
      <TrashedSurveyTable rows={[baris()]} tampilkanHapusPermanen={false} />,
    );
    expect(screen.queryByRole('button', { name: /hapus permanen/i })).not.toBeInTheDocument();

    rerender(<TrashedSurveyTable rows={[baris()]} tampilkanHapusPermanen />);
    expect(within(tabel()).getByRole('button', { name: /hapus permanen/i })).toBeInTheDocument();
    expect(within(kartu()).getByRole('button', { name: /hapus permanen/i })).toBeInTheDocument();
  });

  it('meneruskan baris yang dipilih saat Pulihkan ditekan', () => {
    const onRestore = jest.fn();
    render(<TrashedSurveyTable rows={[baris()]} onRestore={onRestore} />);

    fireEvent.click(within(tabel()).getByRole('button', { name: /pulihkan/i }));
    expect(onRestore).toHaveBeenCalledWith(expect.objectContaining({ id: '91' }));

    // Kartu ponsel memakai penangan yang SAMA. Tanpa uji ini, susunan kedua
    // bisa saja terpasang tanpa aksi sama sekali dan tak ada yang memerah.
    fireEvent.click(within(kartu()).getByRole('button', { name: /pulihkan/i }));
    expect(onRestore).toHaveBeenCalledTimes(2);
  });

  it('baris yang sedang diproses mematikan kedua tombolnya', () => {
    // Penghapusan permanen yang terkirim dua kali membuat permintaan kedua menjawab 404,
    // dan pengguna melihat galat atas tindakan yang justru berhasil.
    render(<TrashedSurveyTable rows={[baris()]} tampilkanHapusPermanen busyId="91" />);

    [tabel(), kartu()].forEach((susunan) => {
      expect(within(susunan).getByRole('button', { name: /pulihkan/i })).toBeDisabled();
      expect(within(susunan).getByRole('button', { name: /hapus permanen/i })).toBeDisabled();
    });
  });

  it('keadaan kosong menjelaskan apa yang akan muncul di sini', () => {
    render(<TrashedSurveyTable rows={[]} />);

    expect(screen.getByText(/survei yang Anda hapus akan muncul di sini/i)).toBeInTheDocument();
  });

  it('di ponsel, aksinya tak bersembunyi di balik gulir horizontal', () => {
    // Tabelnya melebihi lebar ponsel, sehingga kolom Aksi -- satu-satunya
    // alasan halaman ini ada -- berada di luar layar sampai pengguna menemukan
    // sendiri bahwa tabelnya bisa digulir ke samping. Susunan kartu menaruhnya
    // di aliran vertikal yang sama.
    render(<TrashedSurveyTable rows={[baris()]} tampilkanHapusPermanen />);

    expect(tabel().className).toContain('hidden');
    expect(tabel().className).toContain('md:block');
    expect(kartu().className).toContain('md:hidden');
    expect(within(kartu()).getByText('Survei IKM 2026')).toBeInTheDocument();
    expect(within(kartu()).getByText(/12 jawaban/i)).toBeInTheDocument();
  });
});
