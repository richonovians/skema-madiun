import React from 'react';
import { render, screen } from '@testing-library/react';
import RoleLoginPicker from '../RoleLoginPicker';

jest.mock('../../services/actingRole.api', () => ({
  setActingRole: jest.fn().mockResolvedValue({}),
}));

/**
 * LAPISAN PEMILIH PERAN HARUS LEPAS DARI INDUKNYA (15 September 2026, laporan
 * pengguna: "pemilih peran sesudah login jangan ditaruh di situ").
 *
 * Komponen ini sudah menulis dirinya `fixed inset-0` dan memusat, dan memang
 * begitulah ia tampil saat dibuka dari menu "Ganti Peran". Di beranda ia tidak:
 * `SSOLoginButton` lahir di dalam pembungkus ber-`animate-fade-in-up`
 * (HeroSection), dan animasi itu menggerakkan `transform` dengan fill mode
 * `both` -- jadi pembungkusnya memegang transform SELAMANYA, bahkan sesudah
 * animasinya habis.
 *
 * Elemen ber-transform menjadi containing block bagi keturunan `position:
 * fixed`. `inset-0` karena itu tak lagi berarti "seluruh layar", melainkan
 * "kotak setinggi 48px milik tombol masuk" -- itulah sebabnya latar gelapnya
 * cuma menutup sepetak kecil alih-alih meredupkan halaman.
 *
 * Yang diuji di sini karena itu bukan kelas CSS-nya (jsdom tak menghitung tata
 * letak dan akan menyatakan `fixed` itu baik-baik saja), melainkan LETAK
 * SIMPULNYA di pohon DOM: selama lapisannya masih digambar di dalam
 * pembungkusnya, leluhur ber-transform mana pun dapat mengurungnya lagi.
 */
/**
 * Peran `opd` sengaja TIDAK diikutkan. Tanpa tautan OPD, tombolnya tampil
 * nonaktif dengan keterangan "Hubungi Admin Kabupaten" -- dan kalimat itu ikut
 * menjadi nama aksesibel tombolnya, sehingga pencarian "admin kabupaten"
 * menemukan dua tombol sekaligus.
 */
const bukaDiDalamPembungkus = () =>
  render(
    <div data-uji-pembungkus className="animate-fade-in-up">
      <RoleLoginPicker roles={['kabupaten', 'responden']} onCancel={() => {}} />
    </div>,
  );

describe('RoleLoginPicker — lepas dari pembungkusnya', () => {
  it('tidak digambar di dalam pembungkus yang memanggilnya', () => {
    const { container } = bukaDiDalamPembungkus();

    const judul = screen.getByRole('heading', { name: /masuk sebagai/i });

    expect(container.contains(judul)).toBe(false);
  });

  /**
   * PASANGAN kontrol. Lapisan yang lepas dari induknya dengan cara TIDAK
   * dirender sama sekali juga lolos uji di atas -- dan itu bentuk kegagalan
   * yang paling mudah lewat, karena tak ada satu pun galat yang muncul; pemilih
   * perannya sekadar tak pernah terlihat dan login berhenti di tengah jalan.
   */
  it('KONTROL: lapisannya tetap ada di halaman', () => {
    bukaDiDalamPembungkus();

    expect(screen.getByRole('heading', { name: /masuk sebagai/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /admin kabupaten/i })).toBeInTheDocument();
  });
});
