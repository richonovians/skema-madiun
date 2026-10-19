import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import Dropdown from '../Dropdown';

/**
 * Pagar regresi BUG-017 â€” `Dropdown` menyebut namanya, tak pernah menyebut
 * pilihannya.
 *
 * Pemicunya `<button id={id}>` yang dilabeli `<label htmlFor={id}>`. Pada
 * perhitungan nama aksesibel, label itu MENANG atas isi tombol â€” sehingga
 * nilainya, yang justru satu-satunya isi tombol itu, diabaikan seluruhnya.
 * Pemakai awas melihat "Dinas Kesehatan"; pembaca layar mengumumkan "Instansi,
 * tombol", sebelum maupun sesudah memilih.
 *
 * Komponennya dipakai 17 berkas, termasuk formulir pengaduan warga. Di sana
 * akibatnya bukan ketidaknyamanan: pelapor tunanetra tak pernah dapat
 * memastikan instansi mana yang akan menerima laporannya sebelum menekan Kirim.
 *
 * â”€â”€ Kenapa `test.failing()` dan kenapa ada kendali â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * Sama seperti pagar BUG-015: cacatnya belum diperbaiki, jadi suite tetap hijau
 * selama ia ada dan MERAH begitu diperbaiki â€” menuntut anotasinya dicabut. Uji
 * kendali yang wajib lulus ada karena `test.failing()` menelan kegagalan apa
 * pun, termasuk komponen yang tak pernah berhasil dirender.
 *
 * â”€â”€ Satu bukti tak sengaja dari berkas sebelah â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * `Dropdown.test.jsx` mencari pemicunya dengan `screen.getByLabelText('Instansi')`
 * â€” dan itu BERHASIL justru karena cacat ini. Uji yang sudah ada diam-diam
 * bersandar pada perilaku yang salah; ia tetap lulus sesudah diperbaiki (label
 * masih menjadi bagian namanya), tetapi pantas diketahui.
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

/** Pemicunya, dicari lewat labelnya â€” satu-satunya cara yang bekerja hari ini. */
const pemicu = () => screen.getByLabelText('Instansi');

describe('BUG-017 â€” nama aksesibel Dropdown', () => {
  it('kendali â€” nilai terpilih memang TAMPAK di layar', () => {
    renderDropdown();

    // Yang dilihat pemakai awas. Kalau baris ini gagal, ketiga uji di bawah
    // gagal karena sebab lain dan tak berarti apa-apa.
    expect(screen.getByText('Dinas Kesehatan')).toBeInTheDocument();
    expect(pemicu()).toHaveTextContent('Dinas Kesehatan');
  });

  test.failing('nama yang terbaca ikut menyebut nilai yang sedang dipilih', () => {
    renderDropdown();

    // Yang seharusnya terdengar: "Instansi, Dinas Kesehatan". Yang terdengar
    // sekarang: "Instansi" saja. `aria-labelledby` yang menunjuk label DAN
    // nilainya sekaligus memberi keduanya tanpa membuang labelnya â€” dan
    // labelnya memang harus tinggal: dua dropdown bersebelahan yang sama-sama
    // berisi kata waktu ("Semua waktu", "Terbaru dulu") tak dapat dibedakan
    // tanpa itu (lihat komentar di NotificationFilterBar.jsx).
    expect(screen.getByRole('button', { name: /dinas kesehatan/i })).toBeInTheDocument();
  });

  test.failing('pemicunya mengumumkan bahwa ia membuka sebuah daftar', () => {
    renderDropdown();

    // Tanpa `aria-haspopup`, tak ada yang memberi tahu bahwa tombol ini
    // membuka pilihan â€” ia terdengar seperti tombol biasa yang mengerjakan
    // sesuatu begitu ditekan. `EksporMenu.jsx` di folder yang sama sudah
    // memasangnya; polanya dikuasai, hanya tak dipakai di sini.
    expect(pemicu()).toHaveAttribute('aria-haspopup');
  });

  test.failing('keadaan terbuka/tertutup disampaikan lewat aria-expanded', () => {
    renderDropdown();

    expect(pemicu()).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(pemicu());
    expect(pemicu()).toHaveAttribute('aria-expanded', 'true');
  });
});
