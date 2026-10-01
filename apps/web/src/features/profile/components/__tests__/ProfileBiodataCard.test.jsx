import React from 'react';
import { render, screen } from '@testing-library/react';
import ProfileBiodataCard from '../ProfileBiodataCard';

/**
 * KARTU BIODATA pada halaman profil sendiri (1 Oktober 2026).
 *
 * Kartu ini menggambar tiga tanda hubung untuk NIK, telepon, dan alamat, lalu
 * MENJELASKANNYA dengan kalimat "belum tersedia karena tidak disimpan sistem".
 * Penjelasan itu benar ketika ditulis dan menjadi tidak benar hari ini: ketiga
 * kolomnya lahir bersama penyalinan identitas dari akun Helpdesk.
 *
 * Yang kosong kini DISEMBUNYIKAN, bukan diberi strip -- pola yang sama sudah
 * berdiri di ComplaintReporterProfile dan SurveyRespondentCard, dan sebabnya
 * sama: deretan tanda hubung terbaca sebagai aplikasi yang gagal memuat
 * sesuatu, padahal medan kosong adalah keadaan normal bagi akun yang memang
 * tak dikirimi medan itu oleh Helpdesk.
 */
const NIK_TERSAMAR = '3520 04•• •••• 0002';

const pengguna = (over = {}) => ({
  name: 'Siti Aminah',
  email: 'siti@example.go.id',
  nikMasked: NIK_TERSAMAR,
  phone: '+62895396662038',
  address: 'Dusun Timang Desa Waduk',
  occupation: 'Mahasiswa',
  ...over,
});

describe('ProfileBiodataCard', () => {
  it('menampilkan identitas yang terisi', () => {
    render(<ProfileBiodataCard user={pengguna()} />);

    expect(screen.getByText(NIK_TERSAMAR)).toBeInTheDocument();
    expect(screen.getByText('+62895396662038')).toBeInTheDocument();
    expect(screen.getByText('Dusun Timang Desa Waduk')).toBeInTheDocument();
  });

  it('menyembunyikan baris yang kosong, bukan menggambarnya bergaris', () => {
    render(<ProfileBiodataCard user={pengguna({ phone: null, address: null })} />);

    expect(screen.queryByText(/Nomor Telepon/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Alamat Domisili/i)).not.toBeInTheDocument();
    expect(screen.getByText('Nama Lengkap')).toBeInTheDocument();
  });

  it('tak menggambar satu pun medan bernilai strip ketika identitasnya kosong', () => {
    // Diuji sebagai "tak ada ELEMEN yang isinya tepat '-'", bukan "tak ada
    // tanda hubung di mana pun": lencana "Read-Only" pada kartu ini memuat
    // tanda hubung yang sah, dan asersi yang terlalu kasar akan memerah
    // karenanya tanpa ada yang salah.
    render(
      <ProfileBiodataCard
        user={pengguna({ nikMasked: null, phone: null, address: null, occupation: null })}
      />,
    );

    expect(screen.queryByText('-')).not.toBeInTheDocument();
    // Yang terisi tetap tampil -- bukan kartunya yang disembunyikan.
    expect(screen.getByText('Siti Aminah')).toBeInTheDocument();
  });

  /**
   * Kalimat yang MENYALAHKAN SISTEM atas data yang sudah ada. Uji ini
   * menolaknya kembali.
   */
  it('TIDAK lagi mengklaim datanya tidak disimpan sistem', () => {
    render(<ProfileBiodataCard user={pengguna()} />);

    expect(screen.queryByText(/tidak disimpan sistem/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/belum tersedia/i)).not.toBeInTheDocument();
  });

  it('tetap menyatakan NIK-nya disamarkan', () => {
    render(<ProfileBiodataCard user={pengguna()} />);

    expect(screen.getByText(/Tersamarkan demi keamanan data/i)).toBeInTheDocument();
  });

  it('keterangan penyamaran ikut hilang bila NIK-nya memang tak ada', () => {
    render(<ProfileBiodataCard user={pengguna({ nikMasked: null })} />);

    expect(screen.queryByText(/Tersamarkan demi keamanan data/i)).not.toBeInTheDocument();
  });
});
