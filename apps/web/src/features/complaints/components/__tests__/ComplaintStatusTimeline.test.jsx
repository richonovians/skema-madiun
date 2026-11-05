import React from 'react';
import { render, screen, within } from '@testing-library/react';
import ComplaintStatusTimeline from '../ComplaintStatusTimeline';

/**
 * Riwayat status pengaduan (4 November 2026, permintaan pengguna).
 *
 * Bentuk barisnya meniru `ComplaintStatusHistoryEntity`: `label` datang JADI
 * dari backend, `actorNama` `null` berarti SISTEM (bukan "tak diketahui"),
 * dan `catatan` boleh kosong.
 */
const RIWAYAT = [
  {
    id: 1,
    status: 'terkirim',
    label: 'Terkirim',
    catatan: null,
    actorNama: null,
    createdAt: '2026-11-02T02:15:00.000Z',
  },
  {
    id: 2,
    status: 'diverifikasi',
    label: 'Diverifikasi',
    catatan: 'Pengaduan telah diperiksa dan dinyatakan valid.',
    actorNama: 'Admin Kabupaten (Contoh)',
    createdAt: '2026-11-02T06:20:00.000Z',
  },
  {
    id: 3,
    status: 'sedang_ditindaklanjuti',
    label: 'Sedang Ditindaklanjuti',
    catatan: 'Petugas sedang melakukan pemeriksaan di lokasi.',
    actorNama: 'Admin OPD (Contoh)',
    createdAt: '2026-11-03T01:30:00.000Z',
  },
];

const linimasa = () => screen.getByRole('list');

describe('ComplaintStatusTimeline', () => {
  it('menggambar satu baris per peristiwa, urut terlama dulu', () => {
    render(<ComplaintStatusTimeline riwayat={RIWAYAT} currentStatus="Sedang Ditindaklanjuti" />);

    const baris = within(linimasa()).getAllByRole('listitem');
    expect(baris).toHaveLength(3);
    // Urutannya bagian dari ceritanya: riwayat yang terbalik membuat tiket
    // tampak mundur dari "Sedang Ditindaklanjuti" ke "Terkirim".
    expect(baris[0]).toHaveTextContent('Terkirim');
    expect(baris[1]).toHaveTextContent('Diverifikasi');
    expect(baris[2]).toHaveTextContent('Sedang Ditindaklanjuti');
  });

  it('memakai `label` dari backend apa adanya, tidak menerjemahkan ulang', () => {
    // Status yang kelak ditambahkan backend lebih dulu harus tetap terbaca.
    // Kalau komponen ini punya petanya sendiri, baris itu muncul sebagai kode
    // mentah di tengah linimasa.
    render(
      <ComplaintStatusTimeline
        riwayat={[{ ...RIWAYAT[0], status: 'status_masa_depan', label: 'Status Masa Depan' }]}
      />,
    );

    expect(screen.getByText('Status Masa Depan')).toBeInTheDocument();
    expect(screen.queryByText('status_masa_depan')).not.toBeInTheDocument();
  });

  it('menulis "Otomatis oleh sistem" ketika tak ada pelakunya', () => {
    // `actorNama: null` berarti SISTEM, bukan "tak diketahui" — baris
    // "Terkirim" memang tak punya petugas.
    render(<ComplaintStatusTimeline riwayat={RIWAYAT} />);

    const baris = within(linimasa()).getAllByRole('listitem');
    expect(baris[0]).toHaveTextContent(/otomatis oleh sistem/i);
    expect(baris[1]).toHaveTextContent('Admin Kabupaten (Contoh)');
  });

  it('menggambar waktunya lengkap dengan WIB', () => {
    render(<ComplaintStatusTimeline riwayat={RIWAYAT} />);

    const baris = within(linimasa()).getAllByRole('listitem');
    // `toLocaleString('id-ID')` menulis jamnya dengan titik; zona peramban
    // tak pernah menyebut dirinya, jadi "WIB" ditambahkan tersurat.
    expect(baris[0]).toHaveTextContent(/2 November 2026/);
    expect(baris[0]).toHaveTextContent(/WIB/);
  });

  it('menampilkan catatan per baris, dan melewatinya bila kosong', () => {
    render(<ComplaintStatusTimeline riwayat={RIWAYAT} />);

    expect(screen.getByText('Pengaduan telah diperiksa dan dinyatakan valid.')).toBeInTheDocument();
    const baris = within(linimasa()).getAllByRole('listitem');
    // Baris pertama tak bercatatan: ia tak boleh menggambar paragraf kosong
    // maupun tanda hubung.
    expect(baris[0]).not.toHaveTextContent('-');
  });

  it('"Catatan Petugas" memakai catatan dari perpindahan TERBARU', () => {
    // Keputusan pengguna 4 November 2026: bukan medan tersendiri, melainkan
    // catatan terakhir dari riwayat. Yang relevan bagi pembacanya kalimat
    // terbaru, bukan kalimat pertama yang kebetulan ada.
    render(<ComplaintStatusTimeline riwayat={RIWAYAT} />);

    const blok = screen.getByText('Catatan Petugas').closest('div');
    expect(blok).toHaveTextContent('Petugas sedang melakukan pemeriksaan di lokasi.');
    expect(blok).not.toHaveTextContent('dinyatakan valid');
  });

  it('tanpa satu pun catatan, blok "Catatan Petugas" tidak digambar', () => {
    // PASANGANNYA. Blok kosong berlabel "Catatan Petugas" terbaca seperti
    // catatan yang hilang, dan pembacanya akan mencarinya.
    render(<ComplaintStatusTimeline riwayat={[RIWAYAT[0]]} />);

    expect(screen.queryByText('Catatan Petugas')).not.toBeInTheDocument();
  });

  it('lencana menampilkan status BERJALAN, yang boleh berbeda dari baris terakhir', () => {
    // Inti perbedaan rancangannya: pengaduan yang baru masuk hanya punya satu
    // baris riwayat ("Terkirim") sementara statusnya sudah "Menunggu
    // Verifikasi". Keduanya benar, dan keduanya harus terlihat.
    render(<ComplaintStatusTimeline riwayat={[RIWAYAT[0]]} currentStatus="Menunggu Verifikasi" />);

    expect(screen.getByText('Menunggu Verifikasi')).toBeInTheDocument();
    expect(within(linimasa()).getAllByRole('listitem')).toHaveLength(1);
  });

  it('riwayat kosong atau tak tersedia menjelaskan dirinya, bukan kotak kosong', () => {
    render(<ComplaintStatusTimeline riwayat={null} />);

    expect(screen.getByText(/belum tersedia/i)).toBeInTheDocument();
  });

  /**
   * Pengalihan antar-instansi (5 November 2026). `complaints.opd_id` hanya
   * menyimpan pemilik TERAKHIR, jadi nama instansi tujuan harus datang dari
   * barisnya sendiri -- kalau tidak, tiket yang dialihkan dua kali kehilangan
   * tujuan pertamanya bagi pelapor.
   */
  describe('baris pengalihan', () => {
    const BARIS_DIALIHKAN = {
      id: 9,
      status: 'dialihkan',
      label: 'Dialihkan',
      catatan: 'Berkaitan dengan kewenangan infrastruktur.',
      actorNama: 'Admin OPD (Contoh)',
      opdTujuanNama: 'Dinas Pekerjaan Umum dan Penataan Ruang',
      createdAt: '2026-11-05T02:00:00.000Z',
    };

    it('menyebut instansi tujuan di baris Dialihkan', () => {
      render(<ComplaintStatusTimeline riwayat={[RIWAYAT[0], BARIS_DIALIHKAN]} />);

      expect(
        screen.getByText(/Dialihkan ke Dinas Pekerjaan Umum dan Penataan Ruang/i),
      ).toBeInTheDocument();
    });

    it('dua pengalihan menampilkan KEDUA instansi tujuannya', () => {
      render(
        <ComplaintStatusTimeline
          riwayat={[
            RIWAYAT[0],
            BARIS_DIALIHKAN,
            { ...BARIS_DIALIHKAN, id: 10, opdTujuanNama: 'Kecamatan Wungu' },
          ]}
        />,
      );

      expect(screen.getByText(/Dialihkan ke Dinas Pekerjaan Umum/i)).toBeInTheDocument();
      expect(screen.getByText(/Dialihkan ke Kecamatan Wungu/i)).toBeInTheDocument();
    });

    it('baris tanpa opdTujuanNama tidak menggambar barisnya sama sekali', () => {
      // Seluruh baris yang lahir sebelum fitur ini ada membawa `null`. Yang
      // tak boleh terjadi adalah "Dialihkan ke " tanpa nama, atau tanda
      // hubung yang menyiratkan nama yang gagal dimuat.
      render(<ComplaintStatusTimeline riwayat={RIWAYAT} />);

      expect(screen.queryByText(/Dialihkan ke/i)).not.toBeInTheDocument();
    });
  });
});
