import React from 'react';
import { render, screen } from '@testing-library/react';
import CatatanPemotongan from '../CatatanPemotongan';

/**
 * SATU-SATUNYA TEMPAT yang memberi tahu pengguna bahwa daftar yang ia lihat
 * TERPOTONG (15 Oktober 2026).
 *
 * Lima halaman admin mengambil 100 baris sekali lalu memaginasinya di klien,
 * dan daftar warga mengambil 50. Di atas batas itu sisanya tak pernah terlihat
 * dan tak ada apa pun yang mengatakannya -- kendali paginasinya pun menghitung
 * halaman dari baris yang TERAMBIL, bukan dari `meta.pagination.total`, jadi ia
 * tampak lengkap padahal tidak.
 *
 * Polanya meniru `ComplaintStatusBreakdown`, satu-satunya tempat yang sudah
 * berterus terang sebelum hari ini. Bedanya: yang di sana menerangkan ANGKA
 * yang dihitung dari irisan, yang di sini menerangkan DAFTAR yang terpotong.
 */
describe('CatatanPemotongan', () => {
  it('tidak menampilkan apa pun ketika seluruh baris memang terambil', () => {
    const { container } = render(<CatatanPemotongan ditampilkan={12} total={12} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('tidak menampilkan apa pun ketika totalnya belum diketahui', () => {
    // `meta.pagination` tak selalu ada; menebak "terpotong" dari ketiadaan data
    // akan memasang peringatan palsu di setiap halaman.
    const { container } = render(<CatatanPemotongan ditampilkan={12} total={0} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('menyebut jumlah yang ditampilkan DAN totalnya ketika terpotong', () => {
    render(<CatatanPemotongan ditampilkan={100} total={250} />);

    const catatan = screen.getByRole('status');
    expect(catatan).toHaveTextContent('100');
    expect(catatan).toHaveTextContent('250');
  });

  it('memakai nama item yang diberikan, supaya kalimatnya tidak selalu "data"', () => {
    render(<CatatanPemotongan ditampilkan={100} total={250} namaItem="pengaduan" />);

    expect(screen.getByRole('status')).toHaveTextContent(/pengaduan/i);
  });

  it('TIDAK menyebut penyaring pada layar yang memang tak punya penyaring', () => {
    // Daftar pengaduan warga dan Riwayat Aktivitas tak punya pencarian; menyebut
    // penyaring di sana mengklaim lebih dari kenyataannya.
    render(<CatatanPemotongan ditampilkan={10} total={55} namaItem="aktivitas" />);

    expect(screen.getByRole('status')).not.toHaveTextContent(/penyaring/i);
  });

  it('menyebut penyaring ketika layarnya memang menyaring di klien', () => {
    render(<CatatanPemotongan ditampilkan={100} total={250} namaItem="pengguna" adaPenyaring />);

    expect(screen.getByRole('status')).toHaveTextContent(/pencarian dan penyaring/i);
  });

  it('dapat dibacakan pembaca layar tanpa perlu dicari', () => {
    // `role="status"` dengan aria-live: angkanya muncul SESUDAH permintaan
    // selesai, jadi tanpa ini pemakai pembaca layar tak pernah diberi tahu.
    render(<CatatanPemotongan ditampilkan={100} total={250} />);

    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });
});
