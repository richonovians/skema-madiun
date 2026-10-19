import React from 'react';
import { render, screen } from '@testing-library/react';
import ProfileSSOCard from '../ProfileSSOCard';

/**
 * BANNER SSO TAK TERBACA DI PERANGKAT BERMODE GELAP (4 Oktober 2026, laporan
 * pengguna berikut tangkapan layar: "ubah warna teks agar mudah dibaca").
 *
 * Yang tampak di layar bukan warna yang tertulis di kode. Banner ini membawa
 * DUA set warna sekaligus -- palet terang dan palet gelap -- padahal proyek ini
 * tak punya tema gelap sama sekali: tak ada `@custom-variant dark`, tak ada
 * kelas `.dark`, dan tak satu pun token gelap di globals.css. Di Tailwind v4
 * varian `dark:` AKTIF SECARA BAWAAN mengikuti `prefers-color-scheme`
 * perangkat, jadi pada ponsel bermode gelap hanya banner inilah yang berganti
 * rupa sementara seluruh halaman di sekelilingnya tetap terang.
 *
 * Hasilnya terukur, bukan selera: `blue-950` 20% di atas putih menjadi latar
 * #D0D3DD, dan `blue-200` 90% di atasnya menjadi teks #C1DAFB -- rasio kontras
 * 1,05:1, sementara ambang WCAG AA adalah 4,5:1. Teksnya praktis sewarna
 * dengan latarnya. Palet terangnya sendiri tidak bermasalah: `blue-800` di atas
 * `blue-50/70` terukur 8,1:1.
 *
 * Karena jsdom tidak menghitung CSS, kontras tak dapat diukur dari sini. Yang
 * dijaga berkas ini adalah SEBABNYA, bukan akibatnya: tak boleh ada lagi varian
 * `dark:` yang dapat menyalakan palet kedua itu. Angka-angka di atas berasal
 * dari pengukuran warna, bukan dari uji ini.
 */
const PENGGUNA = {
  sso: {
    providerName: null,
    accountId: 'SKEMA-00042',
    portalUrl: 'https://helpdesk.madiunkab.go.id',
    lastSynced: null,
  },
};

const kelasSeluruhKartu = (wadah) =>
  Array.from(wadah.querySelectorAll('[class]')).map((el) => el.getAttribute('class'));

describe('ProfileSSOCard — keterbacaan banner identitas', () => {
  it('tidak memakai satu pun varian dark: yang menyalakan palet kedua', () => {
    const { container } = render(<ProfileSSOCard user={PENGGUNA} />);

    const bervarian = kelasSeluruhKartu(container).filter((k) => k.includes('dark:'));

    expect(bervarian).toEqual([]);
  });

  /**
   * Tautan portal hanya dirender bila `portalUrl` terisi, sehingga kelas
   * `dark:` padanya mudah terlewat dari penyapuan di atas kalau propnya kosong.
   * Keberadaannya dipastikan tersurat agar uji pertama benar-benar melihatnya.
   */
  it('ikut menyapu tautan portal yang hanya muncul bila portalUrl ada', () => {
    render(<ProfileSSOCard user={PENGGUNA} />);

    const tautan = screen.getByRole('link', { name: /buka portal sso helpdesk/i });
    expect(tautan.className).not.toContain('dark:');
  });

  it('memakai biru pekat tanpa alpha untuk teks isi banner', () => {
    render(<ProfileSSOCard user={PENGGUNA} />);

    const teks = screen.getByText(/belum tertaut ke akun helpdesk anda/i);
    expect(teks.className).toContain('text-blue-800');
    expect(teks.className).not.toContain('text-blue-800/90');
  });
});
