import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import ComplaintStatusDonut from '../kabupaten/ComplaintStatusDonut';
import IkmLeaderboard from '../kabupaten/IkmLeaderboard';
import { calculateDonutSegments } from '../../utils/chartHelpers';

/**
 * TC-FE-012 — Grafik dashboard IKM menggambar angka yang sebenarnya.
 *
 * PREMIS ASLI KASUS UJI INI SUDAH USANG. Ia menuntut "tooltip berisi detail
 * nilai NRR dan nama OPD muncul saat kursor diarahkan". Grafiknya tidak memakai
 * pustaka chart apa pun — keduanya SVG dan div yang ditulis tangan — dan
 * pilihan desainnya berbeda serta lebih baik: **nilainya selalu terlihat**,
 * bukan disembunyikan di balik hover. Nilai IKM tertulis di samping tiap nama
 * OPD, dan persentase tiap status tertulis di bawah donat. Hover yang tak
 * pernah bisa dilakukan di layar sentuh karena itu tak lagi jadi syarat.
 *
 * Yang diuji sebagai gantinya adalah risiko yang sesungguhnya ada pada grafik
 * gambar-sendiri: **angka yang digambar menyimpang dari angka yang dilaporkan.**
 * Grafik yang salah lebih berbahaya daripada grafik yang tak ada — ia terlihat
 * berwibawa, dan tak seorang pun memeriksanya ulang.
 *
 * Kerusakan yang ditangkap:
 *  - `calculateDonutSegments` berhenti menumpuk offset → seluruh irisan mulai
 *    dari jam 12 dan saling menimpa, donatnya terbaca sebagai satu warna;
 *  - panjang irisan tak lagi sebanding persentasenya;
 *  - nilai IKM di papan peringkat tak sebanding lebar batangnya;
 *  - nama OPD panjang terpotong TANPA `title`, sehingga tak ada cara apa pun
 *    mengetahui OPD mana yang dimaksud;
 *  - keadaan kosong menampilkan grafik nol yang terbaca sebagai "nilainya nol"
 *    — pada skala IKM, 0 berarti pelayanan terburuk, bukan "belum ada data".
 */

const STATUS = {
  total: 40,
  status: [
    { id: 'diterima', label: 'Baru', percentage: 50, color: '#3b82f6' },
    { id: 'diproses', label: 'Diproses', percentage: 25, color: '#f59e0b' },
    { id: 'selesai', label: 'Selesai', percentage: 15, color: '#10b981' },
    { id: 'ditolak', label: 'Ditolak', percentage: 10, color: '#ef4444' },
  ],
};

const PERINGKAT = [
  { surveyId: 1, opdId: 11, opdName: 'Dinas Kesehatan', ikmScore: 88.25 },
  { surveyId: 2, opdId: 12, opdName: 'Dinas Pendidikan', ikmScore: 76.5 },
  {
    surveyId: 3,
    opdId: 13,
    opdName: 'Dinas Pemberdayaan Perempuan dan Perlindungan Anak',
    ikmScore: 64.75,
  },
];

describe('calculateDonutSegments (TC-FE-012)', () => {
  it('menempatkan tiap irisan tepat sesudah irisan sebelumnya', () => {
    const hasil = calculateDonutSegments(STATUS.status);

    // Lingkarannya ber-r=15.915 sehingga kelilingnya persis 100 — jadi
    // "persentase" dan "panjang garis" adalah satuan yang sama.
    expect(hasil.map((s) => s.dashArray)).toEqual(['50 50', '25 75', '15 85', '10 90']);
    // Offset menumpuk: 0, -50, -75, -90. Kalau ia berhenti menumpuk, seluruh
    // irisan mulai dari titik yang sama dan donatnya jadi satu warna.
    //
    // Irisan pertama bernilai `-0` (hasil `-cumulativePercentage` saat
    // cumulative masih 0), dan `toEqual` membedakan `-0` dari `0`. SVG tidak —
    // keduanya menggambar hal yang persis sama — jadi tandanya disamakan di
    // sini alih-alih menuntut kode produksi berubah demi pengujian.
    const offset = hasil.map((s) => (Object.is(s.dashOffset, -0) ? 0 : s.dashOffset));
    expect(offset).toEqual([0, -50, -75, -90]);
  });

  it('tidak mengubah data aslinya', () => {
    const masukan = STATUS.status.map((s) => ({ ...s }));
    calculateDonutSegments(masukan);

    expect(masukan).toEqual(STATUS.status);
  });

  it('menghasilkan daftar kosong untuk masukan kosong', () => {
    expect(calculateDonutSegments([])).toEqual([]);
  });
});

describe('ComplaintStatusDonut (TC-FE-012)', () => {
  it('menggambar satu irisan per status dengan panjang sesuai persentasenya', async () => {
    const { container } = render(<ComplaintStatusDonut data={STATUS} />);

    // Lingkaran pertama adalah alas abu-abu; sisanya irisan data.
    const irisan = Array.from(container.querySelectorAll('circle')).slice(1);
    expect(irisan).toHaveLength(STATUS.status.length);

    STATUS.status.forEach((s, i) => {
      expect(irisan[i]).toHaveAttribute('stroke-dasharray', `${s.percentage} ${100 - s.percentage}`);
      expect(irisan[i]).toHaveAttribute('stroke', s.color);
    });

    // Offset baru dipasang sesudah animasi mulai; sebelum itu semuanya 0 —
    // memeriksanya terlalu cepat berarti memeriksa keadaan sebelum digambar.
    await waitFor(() => expect(irisan[1]).toHaveAttribute('stroke-dashoffset', '-50'));
  });

  it('menampilkan total tiket dan persentase tiap status sebagai angka, bukan hanya gambar', () => {
    render(<ComplaintStatusDonut data={STATUS} />);

    expect(screen.getByText('40')).toBeInTheDocument();
    for (const s of STATUS.status) {
      expect(screen.getByText(s.label)).toBeInTheDocument();
      expect(screen.getByText(`${s.percentage}%`)).toBeInTheDocument();
    }
  });

  it('tidak merender apa pun ketika datanya belum ada', () => {
    // Menggambar donat kosong berarti mengaku "0 tiket" padahal yang benar
    // adalah "belum tahu".
    const { container } = render(<ComplaintStatusDonut data={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('IkmLeaderboard (TC-FE-012)', () => {
  it('menampilkan nilai IKM tiap OPD sebagai angka satu desimal', async () => {
    render(<IkmLeaderboard data={PERINGKAT} periode="2026-Q3" />);

    expect(screen.getByText('88.3')).toBeInTheDocument();
    expect(screen.getByText('76.5')).toBeInTheDocument();
    expect(screen.getByText('64.8')).toBeInTheDocument();
  });

  it('memberi tiap batang lebar sebanding nilai IKM-nya', async () => {
    const { container } = render(<IkmLeaderboard data={PERINGKAT} periode="2026-Q3" />);

    // Batang mulai dari 0% lalu tumbuh — tunggu sampai animasinya jalan,
    // kalau tidak yang diperiksa adalah keadaan sebelum digambar.
    await waitFor(() => {
      const batang = container.querySelectorAll('.h-3 > div');
      expect(batang[0]).toHaveStyle({ width: '88.25%' });
    });
    const batang = container.querySelectorAll('.h-3 > div');
    expect(batang[1]).toHaveStyle({ width: '76.5%' });
    expect(batang[2]).toHaveStyle({ width: '64.75%' });
  });

  it('menyimpan nama OPD panjang di atribut `title` sehingga tetap terbaca saat terpotong', () => {
    render(<IkmLeaderboard data={PERINGKAT} periode="2026-Q3" />);

    const panjang = 'Dinas Pemberdayaan Perempuan dan Perlindungan Anak';
    // Namanya dipotong dengan elipsis di layar sempit; tanpa `title`, tak ada
    // cara apa pun mengetahui OPD mana yang sedang dilihat.
    expect(screen.getByText(panjang)).toHaveAttribute('title', panjang);
  });

  it('menyebut periode yang sedang ditampilkan', () => {
    render(<IkmLeaderboard data={PERINGKAT} periode="2026-Q3" />);
    expect(screen.getByText(/Triwulan III - 2026/)).toBeInTheDocument();
  });

  it('menerangkan kekosongan sebagai periode tanpa data, bukan sebagai nilai nol', () => {
    render(<IkmLeaderboard data={[]} periode="2026-Q3" />);

    expect(screen.getByText(/Belum ada hasil IKM untuk Triwulan III - 2026/)).toBeInTheDocument();
    // Tak boleh ada satu batang pun: batang selebar 0% pada papan peringkat IKM
    // terbaca sebagai nilai terburuk, bukan sebagai ketiadaan data.
    expect(screen.queryByText(/^0\.0$/)).not.toBeInTheDocument();
  });
});
