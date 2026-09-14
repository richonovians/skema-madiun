import React from 'react';
import { render, screen } from '@testing-library/react';
import ActiveAccountsInfo from '../ActiveAccountsInfo';

/**
 * Info jumlah akun aktif (permintaan pengguna 6 September 2026): superuser
 * melihat seluruh sistem, Admin OPD hanya akun OPD-nya.
 *
 * Satu komponen dipakai ketiga halaman supaya angka yang sama tak dijelaskan
 * dengan tiga kalimat berbeda -- yang bedanya cuma LINGKUPnya, dan lingkup itu
 * harus tersurat di layar karena dua angka ini memang berbeda arti.
 */
describe('ActiveAccountsInfo', () => {
  it('menampilkan jumlah beserta lingkupnya', () => {
    render(<ActiveAccountsInfo activeCount={5} scope="all" />);

    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText(/akun aktif di seluruh sistem/i)).toBeInTheDocument();
  });

  it('lingkup OPD menyebut "tertaut OPD ini", bukan sekadar "akun aktif"', () => {
    render(<ActiveAccountsInfo activeCount={2} scope="opd" />);

    // Tanpa kata "tertaut OPD ini", angka 2 mudah disalahartikan sebagai
    // jumlah WARGA yang dilayani -- padahal yang dihitung akun admin.
    expect(screen.getByText(/akun aktif tertaut opd ini/i)).toBeInTheDocument();
  });

  it('menyebut totalnya bila diberikan', () => {
    render(<ActiveAccountsInfo activeCount={5} totalCount={7} scope="all" />);

    expect(screen.getByText(/dari 7 akun/i)).toBeInTheDocument();
  });

  it('angka belum tersedia -> menampilkan "-", bukan 0', () => {
    // 0 adalah pernyataan ("tak ada akun aktif"); null berarti kita belum tahu.
    // Menampilkan 0 untuk keduanya membuat kegagalan muat terlihat seperti data.
    render(<ActiveAccountsInfo activeCount={null} scope="all" />);

    expect(screen.getByText('-')).toBeInTheDocument();
  });
});
