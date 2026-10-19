import React from 'react';
import { render, screen } from '@testing-library/react';
import ComplaintReporterProfile from '../ComplaintReporterProfile';

/**
 * KARTU "PROFIL PELAPOR" pada detail pengaduan (1 Oktober 2026).
 *
 * Kartu inilah yang melahirkan laporan pengguna: NIK, No. Telepon, dan Alamat
 * selalu bertanda hubung karena tak ada sumbernya di backend. Sumbernya kini
 * ada (klaim SSO Helpdesk -> tiga kolom `users` -> detail pengaduan), tetapi
 * SSO melayani ASN maupun warga umum sehingga medan kosong tetap menjadi
 * keadaan NORMAL, bukan kegagalan.
 *
 * Karena itu yang kosong DISEMBUNYIKAN, bukan diberi strip. Deretan tanda
 * hubung terbaca sebagai aplikasi yang gagal memuat sesuatu, dan di situlah
 * laporan ini bermula. Pola yang sama sudah dipakai SurveyRespondentCard.
 */
const pelapor = (over = {}) => ({
  name: 'Siti Aminah',
  // TERSAMAR: backend menyamarkannya di hulu sejak 1 Oktober 2026, jadi inilah
  // bentuk yang benar-benar diterima komponen ini.
  nik: '3520 04•• •••• 0002',
  phone: '+62895396662038',
  address: 'Dusun Timang Desa Waduk',
  ...over,
});

describe('ComplaintReporterProfile', () => {
  it('menampilkan keempat medan ketika semuanya terisi', () => {
    render(<ComplaintReporterProfile reporter={pelapor()} />);

    expect(screen.getByText('Siti Aminah')).toBeInTheDocument();
    expect(screen.getByText('3520 04•• •••• 0002')).toBeInTheDocument();
    expect(screen.getByText('+62895396662038')).toBeInTheDocument();
    expect(screen.getByText('Dusun Timang Desa Waduk')).toBeInTheDocument();
  });

  it('menyembunyikan LABEL medan yang kosong, bukan menggambarnya bergaris', () => {
    render(<ComplaintReporterProfile reporter={pelapor({ nik: null, address: null })} />);

    expect(screen.queryByText('NIK')).not.toBeInTheDocument();
    expect(screen.queryByText('Alamat')).not.toBeInTheDocument();
    // Yang terisi tetap tampil -- bukan kartunya yang disembunyikan.
    expect(screen.getByText('No. Telepon')).toBeInTheDocument();
    expect(screen.getByText('+62895396662038')).toBeInTheDocument();
  });

  it('tak menggambar satu pun tanda hubung ketika ketiga medan kosong', () => {
    const { container } = render(
      <ComplaintReporterProfile reporter={pelapor({ nik: null, phone: null, address: null })} />,
    );

    expect(container.textContent).not.toContain('-');
    expect(screen.getByText('Siti Aminah')).toBeInTheDocument();
  });

  /**
   * Pengaduan anonim: adapter mengisi `name` dengan 'Anonim' dan ketiga medan
   * lain null, sebab backend menghapus kuncinya sama sekali. Kartunya tetap
   * digambar -- "Anonim" adalah jawaban, dan kartu yang hilang justru membuat
   * halaman tampak rusak.
   */
  it('pengaduan anonim: hanya nama "Anonim" yang tampil', () => {
    render(
      <ComplaintReporterProfile
        reporter={{ name: 'Anonim', nik: null, phone: null, address: null }}
      />,
    );

    expect(screen.getByText('Anonim')).toBeInTheDocument();
    expect(screen.queryByText('NIK')).not.toBeInTheDocument();
    expect(screen.queryByText('No. Telepon')).not.toBeInTheDocument();
    expect(screen.queryByText('Alamat')).not.toBeInTheDocument();
  });

  it('tanpa objek pelapor sama sekali, tak menggambar apa pun', () => {
    const { container } = render(<ComplaintReporterProfile reporter={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  /**
   * String kosong diperlakukan sama dengan null. Jalur `/api/me` Helpdesk
   * sungguhan memakai `''` untuk sebagian medan dan `null` untuk sebagian lain
   * dalam satu respons; pemeta di backend sudah menyamakan keduanya, dan
   * komponen ini tak boleh menjadi tempat salah satunya lolos kembali.
   */
  it('string kosong diperlakukan sama dengan tidak ada', () => {
    render(<ComplaintReporterProfile reporter={pelapor({ nik: '', phone: '' })} />);

    expect(screen.queryByText('NIK')).not.toBeInTheDocument();
    expect(screen.queryByText('No. Telepon')).not.toBeInTheDocument();
    expect(screen.getByText('Alamat')).toBeInTheDocument();
  });
});

/**
 * Kartu yang SELURUH medannya kosong. Secara praktis tak terjadi pada
 * pengaduan biasa -- `users.nama` NOT NULL sehingga baris nama selalu ada --
 * tetapi ruang kosong di bawah judul terbaca sebagai pemuatan yang belum
 * selesai, dan itu persis kesan yang sedang dihapus pekerjaan ini.
 */
describe('ComplaintReporterProfile — seluruh medan kosong', () => {
  it('mengatakan bahwa Helpdesk tak mengirim data, bukan menyisakan ruang kosong', () => {
    render(
      <ComplaintReporterProfile
        reporter={{ name: null, nik: null, phone: null, address: null }}
      />,
    );

    expect(screen.getByText(/Helpdesk tidak mengirimkan data profil/i)).toBeInTheDocument();
    expect(screen.getByText('Profil Pelapor')).toBeInTheDocument();
  });

  it('kartu yang ADA isinya tidak memuat keterangan itu (kontrol)', () => {
    render(<ComplaintReporterProfile reporter={pelapor()} />);

    expect(screen.queryByText(/Helpdesk tidak mengirimkan data profil/i)).not.toBeInTheDocument();
  });
});

/**
 * GAYA NILAINYA SERAGAM (1 Oktober 2026, permintaan pengguna: "ubah gaya
 * fontnya sesuai seperti font no telepon dan alamat").
 *
 * NIK sebelumnya digambar dengan `font-mono` di atas latar kotak abu
 * berbingkai, sementara telepon dan alamat polos. Perbedaan itu membuat satu
 * baris tampak sebagai kode yang berbeda jenisnya dari tetangganya, padahal
 * ketiganya sama-sama satu medan data diri.
 *
 * Diuji sebagai KESAMAAN dengan baris telepon, bukan sebagai daftar kelas yang
 * diharapkan. Daftar kelas akan basi tiap kali gaya kartunya disetel ulang,
 * sedangkan yang benar-benar diminta pengguna adalah ketiganya seragam.
 */
describe('ComplaintReporterProfile — gaya nilai medan', () => {
  it('NIK memakai gaya yang sama persis dengan No. Telepon', () => {
    render(<ComplaintReporterProfile reporter={pelapor()} />);

    const nik = screen.getByText('3520 04•• •••• 0002');
    const telepon = screen.getByText('+62895396662038');

    expect(nik.className).toBe(telepon.className);
  });

  it('NIK tidak lagi digambar sebagai kode bermonospasi berlatar', () => {
    render(<ComplaintReporterProfile reporter={pelapor()} />);

    const nik = screen.getByText('3520 04•• •••• 0002');

    expect(nik.className).not.toMatch(/font-mono/);
    expect(nik.className).not.toMatch(/bg-|border|rounded/);
  });
});
