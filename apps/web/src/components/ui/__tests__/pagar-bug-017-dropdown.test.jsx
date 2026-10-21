import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import Dropdown from '../Dropdown';

/**
 * Pagar regresi BUG-017 — `Dropdown` menyebut namanya, tak pernah menyebut
 * pilihannya.
 *
 * Pemicunya `<button id={id}>` yang dilabeli `<label htmlFor={id}>`. Pada
 * perhitungan nama aksesibel, label itu MENANG atas isi tombol — sehingga
 * nilainya, yang justru satu-satunya isi tombol itu, diabaikan seluruhnya.
 * Pemakai awas melihat "Dinas Kesehatan"; pembaca layar mengumumkan "Instansi,
 * tombol", sebelum maupun sesudah memilih.
 *
 * Komponennya dipakai 17 berkas, termasuk formulir pengaduan warga. Di sana
 * akibatnya bukan ketidaknyamanan: pelapor tunanetra tak pernah dapat
 * memastikan instansi mana yang akan menerima laporannya sebelum menekan Kirim.
 *
 * ── PAGAR REGRESI SUNGGUHAN SEJAK 21 OKTOBER 2026 ───────────────────────────
 * Sama seperti pagar BUG-015: cacatnya sudah diperbaiki dan `test.failing()`
 * DICABUT dari ketiga uji di bawah. Selama anotasi itu ada, suite hijau selagi
 * cacatnya hidup dan MERAH begitu diperbaiki — menuntut dirinya dicabut. Uji
 * kendalinya lahir karena `test.failing()` menelan kegagalan apa pun, termasuk
 * komponen yang tak pernah berhasil dirender, dan tetap tinggal karena ia
 * membedakan atribut yang hilang dari render yang tak pernah terjadi.
 *
 * ── Satu bukti tak sengaja dari berkas sebelah ──────────────────────────────
 * `Dropdown.test.jsx` mencari pemicunya dengan `screen.getByLabelText('Instansi')`
 * — dan itu BERHASIL justru karena cacat ini. Uji yang sudah ada diam-diam
 * bersandar pada perilaku yang salah. Ia tetap lulus sesudah diperbaiki, tetapi
 * lewat jalan yang berbeda: `aria-labelledby` menggantikan tautan
 * `htmlFor`/`id` sebagai sumber label di mata testing-library, dan pencocokannya
 * dilakukan per label yang dirujuk — sehingga "Instansi" sendiri tetap cocok
 * walau nama utuhnya kini "Instansi Dinas Kesehatan".
 */

const OPSI = [
  { label: 'Pilih Instansi', value: '' },
  { label: 'Dinas Kesehatan', value: '1' },
  { label: 'Dinas Pendidikan dan Kebudayaan', value: '2' },
];

const renderDropdown = (props = {}) =>
  render(
    <Dropdown
      label="Instansi"
      id="opd"
      options={OPSI}
      value="1"
      onChange={jest.fn()}
      {...props}
    />,
  );

/**
 * Pemicunya, dicari lewat labelnya. Sampai 21 Oktober 2026 ini satu-satunya
 * cara yang bekerja; sejak nilainya ikut masuk nama aksesibel, ia juga dapat
 * dicari lewat `getByRole('button', { name: /dinas kesehatan/i })` seperti uji
 * pertama di bawah. Jalan lewat label dipertahankan karena ketiga uji di bawah
 * memeriksa ATRIBUT pemicunya, dan label adalah penanda yang tak berubah saat
 * pilihannya berganti.
 */
const pemicu = () => screen.getByLabelText('Instansi');

describe('BUG-017 — nama aksesibel Dropdown', () => {
  it('kendali — nilai terpilih memang TAMPAK di layar', () => {
    renderDropdown();

    // Yang dilihat pemakai awas. Kalau baris ini gagal, ketiga uji di bawah
    // gagal karena sebab lain dan tak berarti apa-apa.
    expect(screen.getByText('Dinas Kesehatan')).toBeInTheDocument();
    expect(pemicu()).toHaveTextContent('Dinas Kesehatan');
  });

  it('nama yang terbaca ikut menyebut nilai yang sedang dipilih', () => {
    renderDropdown();

    // Yang terdengar: "Instansi, Dinas Kesehatan". Sampai 21 Oktober 2026 yang
    // terdengar hanya "Instansi". `aria-labelledby` yang menunjuk label DAN
    // nilainya sekaligus memberi keduanya tanpa membuang labelnya — dan
    // labelnya memang harus tinggal: dua dropdown bersebelahan yang sama-sama
    // berisi kata waktu ("Semua waktu", "Terbaru dulu") tak dapat dibedakan
    // tanpa itu (lihat komentar di NotificationFilterBar.jsx).
    expect(screen.getByRole('button', { name: /dinas kesehatan/i })).toBeInTheDocument();
  });

  it('pemicunya mengumumkan bahwa ia membuka sebuah daftar', () => {
    renderDropdown();

    // Tanpa `aria-haspopup`, tak ada yang memberi tahu bahwa tombol ini
    // membuka pilihan — ia terdengar seperti tombol biasa yang mengerjakan
    // sesuatu begitu ditekan. `EksporMenu.jsx` di folder yang sama sudah
    // memasangnya; polanya dikuasai, hanya tak dipakai di sini.
    expect(pemicu()).toHaveAttribute('aria-haspopup');
  });

  it('keadaan terbuka/tertutup disampaikan lewat aria-expanded', () => {
    renderDropdown();

    expect(pemicu()).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(pemicu());
    expect(pemicu()).toHaveAttribute('aria-expanded', 'true');
  });
});
