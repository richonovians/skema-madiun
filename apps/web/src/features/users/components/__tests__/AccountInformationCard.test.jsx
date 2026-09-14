import React from 'react';
import { render, screen } from '@testing-library/react';
import AccountInformationCard from '../AccountInformationCard';

/**
 * Identitas akun (nama & email) berasal dari Helpdesk Diskominfo, bukan dari
 * SKEMA. Di halaman "Ubah Role Admin" kedua field itu dikunci: satu-satunya
 * yang boleh diubah dari sini adalah role untuk sistem SKEMA.
 *
 * Berkas ini menguji KEDUA keadaan, bukan hanya yang terkunci. Tanpa uji
 * keadaan terbuka, mengunci field secara permanen (mis. salah tulis atribut
 * `disabled` tanpa syarat) akan lolos tanpa satu pun uji memerah -- padahal
 * halaman TAMBAH admin memang harus bisa mengisi keduanya.
 */
const formData = { fullName: 'Budi Santoso', email: 'budi@madiunkab.go.id' };

const NAMA = /nama lengkap/i;
const EMAIL = /alamat email/i;

describe('AccountInformationCard', () => {
  it('baku (halaman tambah admin): nama & email dapat diisi', () => {
    render(<AccountInformationCard formData={formData} onChange={() => {}} errors={{}} />);

    expect(screen.getByLabelText(NAMA)).toBeEnabled();
    expect(screen.getByLabelText(EMAIL)).toBeEnabled();
  });

  it('identityLocked: nama DAN email dua-duanya dikunci', () => {
    render(
      <AccountInformationCard
        formData={formData}
        onChange={() => {}}
        errors={{}}
        identityLocked
      />,
    );

    expect(screen.getByLabelText(NAMA)).toBeDisabled();
    expect(screen.getByLabelText(EMAIL)).toBeDisabled();
  });

  it('identityLocked: nilainya tetap DITAMPILKAN, bukan disembunyikan', () => {
    // Dikunci bukan berarti dirahasiakan -- admin perlu memastikan ia sedang
    // mengubah role orang yang benar.
    render(
      <AccountInformationCard
        formData={formData}
        onChange={() => {}}
        errors={{}}
        identityLocked
      />,
    );

    expect(screen.getByLabelText(NAMA)).toHaveValue('Budi Santoso');
    expect(screen.getByLabelText(EMAIL)).toHaveValue('budi@madiunkab.go.id');
  });

  it('identityLocked: menjelaskan SEBABNYA (Helpdesk), bukan cuma "tidak dapat diubah"', () => {
    render(
      <AccountInformationCard
        formData={formData}
        onChange={() => {}}
        errors={{}}
        identityLocked
      />,
    );

    // Alasannya wajib disebut: tanpa itu admin tak tahu harus ke mana untuk
    // membetulkan nama yang salah, dan halaman ini menjadi jalan buntu.
    //
    // Frasa yang diperiksa SENGAJA khas. Kata 'Helpdesk' saja tak cukup:
    // AccountNotice yang juga dirender di halaman edit sudah memuatnya
    // ('SSO Helpdesk Diskominfo'), sehingga assertion selebar itu lulus
    // palsu di uji tingkat halaman.
    expect(screen.getByText(new RegExp('tidak dapat diubah dari SKEMA', 'i'))).toBeInTheDocument();
  });

  it('baku: TIDAK menampilkan keterangan Helpdesk', () => {
    render(<AccountInformationCard formData={formData} onChange={() => {}} errors={{}} />);

    expect(screen.queryByText(new RegExp('tidak dapat diubah dari SKEMA', 'i'))).not.toBeInTheDocument();
  });
});
