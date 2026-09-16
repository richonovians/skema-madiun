import React from 'react';
import { render, screen } from '@testing-library/react';
import KartuStatistikHero from '../KartuStatistikHero';
import { getStatistics } from '@/features/statistics/services/statistics.api';

jest.mock('@/features/statistics/services/statistics.api', () => ({
  getStatistics: jest.fn(),
}));

const DATA = {
  summary: {
    ikm: 91.2,
    totalRespondents: 438,
    totalComplaints: 77,
    activeOpd: 62,
    avgSlaDays: 3.4,
  },
  ikmTrend: [
    { month: 'Triwulan I - 2025', value: 77.78 },
    { month: 'Triwulan I - 2026', value: 88 },
    { month: 'Triwulan III - 2026', value: 91.2 },
  ],
  // Angka sengaja dipilih supaya hitung-mundur dari persentase MELESET:
  // 33% dari 1000 memberi 330, sedangkan jumlah sebenarnya 333. Dengan angka
  // kecil keduanya kebetulan bertemu, dan ujinya jadi tak menahan apa pun.
  complaintStatus: {
    total: 1000,
    status: [
      { id: 'diterima', label: 'Baru', count: 667, percentage: 67 },
      { id: 'selesai', label: 'Selesai', count: 333, percentage: 33 },
    ],
  },
};

describe('KartuStatistikHero', () => {
  beforeEach(() => jest.clearAllMocks());

  it('menampilkan nilai IKM dari data yang diambil, bukan angka tetap', async () => {
    getStatistics.mockResolvedValue(DATA);

    render(<KartuStatistikHero />);

    // Angka sengaja tak lazim: kartu yang menuliskan nilainya langsung di dalam
    // kode akan tetap hijau pada 82,64 dan lolos tanpa pernah memanggil apa pun.
    // SEKALI saja. Sebelum 16 September 2026 angkanya muncul dua kali -- kartu
    // desktop dan strip ringkasan khusus ponsel -- dan strip itu kini digantikan
    // kartu yang sama, yang kini ikut tampil di layar sempit.
    expect(await screen.findAllByText('91,2')).toHaveLength(1);
    expect(screen.getByText(/438/)).toBeInTheDocument();
  });

  it('selagi memuat, kerangkanya tampil dan angkanya belum', () => {
    getStatistics.mockReturnValue(new Promise(() => {}));

    render(<KartuStatistikHero />);

    expect(screen.getByTestId('kerangka-statistik')).toBeInTheDocument();
    expect(screen.queryByText('91,2')).not.toBeInTheDocument();
  });

  /**
   * PASANGAN kontrol, dan ini yang paling penting. Kartu yang tetap menggambar
   * dirinya saat permintaannya gagal akan menuliskan "0" -- dan nol di halaman
   * utama terbaca sebagai kabupaten tanpa satu pun layanan, bukan sebagai
   * jaringan yang sedang putus.
   */
  it('KONTROL: saat gagal, kartu pernyataan yang muncul dan tak ada angka', async () => {
    getStatistics.mockRejectedValue(new Error('jaringan putus'));

    render(<KartuStatistikHero />);

    expect(await screen.findByText(/terhubung sso madiun/i)).toBeInTheDocument();
    expect(screen.queryByTestId('nilai-ikm')).not.toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('grafik garis bertitik sebanyak periode pada data', async () => {
    getStatistics.mockResolvedValue(DATA);

    const { container } = render(<KartuStatistikHero />);
    await screen.findByTestId('nilai-ikm');

    const garis = container.querySelector('polyline');
    expect(garis).toBeInTheDocument();
    expect(garis.getAttribute('points').trim().split(/\s+/)).toHaveLength(DATA.ikmTrend.length);
  });

  it('batang digambar satu per periode', async () => {
    getStatistics.mockResolvedValue(DATA);

    const { container } = render(<KartuStatistikHero />);
    await screen.findByTestId('nilai-ikm');

    expect(container.querySelectorAll('[data-batang]')).toHaveLength(DATA.ikmTrend.length);
  });

  /**
   * Kartu ini ada untuk menjawab keraguan yang sebenarnya menahan warga:
   * apakah laporan saya akan ditanggapi, dan apakah pernah ada yang tuntas.
   * "OPD Aktif 62" tak menjawab keduanya.
   */
  it('menampilkan lama tanggapan dan jumlah pengaduan yang selesai', async () => {
    getStatistics.mockResolvedValue(DATA);

    render(<KartuStatistikHero />);
    await screen.findByTestId('nilai-ikm');

    expect(screen.getByText(/3,4 hari/i)).toBeInTheDocument();
    expect(screen.getByText('333')).toBeInTheDocument();
    expect(screen.getByText(/pengaduan selesai/i)).toBeInTheDocument();
  });

  /**
   * Instalasi baru belum punya pengaduan yang selesai, jadi `avgSlaDays` belum
   * ada nilainya. "0 hari" akan terbaca sebagai janji tanggapan seketika, dan
   * "null hari" sebagai aplikasi rusak -- keduanya lebih buruk daripada tak
   * menampilkan apa pun.
   */
  it.each([
    ['null', null],
    ['nol', 0],
  ])('KONTROL: lama tanggapan %s tak dijanjikan apa-apa', async (_nama, nilai) => {
    getStatistics.mockResolvedValue({
      ...DATA,
      summary: { ...DATA.summary, avgSlaDays: nilai },
    });

    render(<KartuStatistikHero />);
    await screen.findByTestId('nilai-ikm');

    expect(screen.queryByText(/hari/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/null|NaN/)).not.toBeInTheDocument();
    // Kartu penggantinya tetap ada, kolomnya tak berlubang.
    expect(screen.getByText(/pengaduan masuk/i)).toBeInTheDocument();
  });

  /**
   * Label penuh "Triwulan III - 2026" tak muat di kartu selebar 200px: terukur
   * di peramban, ia membungkus dan mendorong kartunya melebar sampai keluar
   * susunan. Yang dipendekkan hanya TAMPILANNYA; bentuk yang tak dikenali
   * dibiarkan apa adanya, supaya perubahan format di adapter tak diam-diam
   * menghasilkan label kosong.
   */
  it('label periode dipendekkan agar muat di kartu batang', async () => {
    getStatistics.mockResolvedValue(DATA);

    render(<KartuStatistikHero />);
    await screen.findByTestId('nilai-ikm');

    expect(screen.getByText("TW3 '26")).toBeInTheDocument();
    expect(screen.queryByText(/Triwulan III/)).not.toBeInTheDocument();
  });

  it('bentuk periode yang tak dikenali ditampilkan apa adanya', async () => {
    getStatistics.mockResolvedValue({
      ...DATA,
      ikmTrend: [{ month: 'Semester Ganjil 2026', value: 80 }],
    });

    render(<KartuStatistikHero />);
    await screen.findByTestId('nilai-ikm');

    expect(screen.getByText('Semester Ganjil 2026')).toBeInTheDocument();
  });

  /**
   * Ketiga kartu SEBELUMNYA muncul serempak begitu data tiba. Dimunculkan
   * bergiliran, matanya sempat mengikuti satu per satu alih-alih disodori
   * seluruhnya sekaligus.
   */
  it('kartu masuk bergiliran, bukan serempak', async () => {
    getStatistics.mockResolvedValue(DATA);

    const { container } = render(<KartuStatistikHero />);
    await screen.findByTestId('nilai-ikm');

    const jeda = [...container.querySelectorAll('.animate-fade-in-up')].map(
      (el) => el.style.animationDelay,
    );
    expect(jeda).toHaveLength(3);
    // Jeda yang sama untuk ketiganya bukan bergiliran, hanya tampak begitu.
    expect(new Set(jeda).size).toBe(3);
  });

  /**
   * Batang yang langsung terpampang penuh tak menceritakan apa-apa; yang tumbuh
   * dari bawah memperlihatkan bahwa tingginya adalah nilai, bukan hiasan.
   */
  it('batang tren tumbuh bergiliran dari bawah', async () => {
    getStatistics.mockResolvedValue(DATA);

    const { container } = render(<KartuStatistikHero />);
    await screen.findByTestId('nilai-ikm');

    const batang = [...container.querySelectorAll('[data-batang]')];
    expect(batang).toHaveLength(DATA.ikmTrend.length);
    batang.forEach((b) => expect(b.className).toMatch(/animate-tumbuh-batang/));
    expect(new Set(batang.map((b) => b.style.animationDelay)).size).toBe(batang.length);
  });

  /**
   * Kartu yang terangkat dengan bayangan memekat adalah bahasa visual untuk
   * "ini bisa diklik". Menjanjikannya tanpa tujuan berarti menyesatkan; kartunya
   * menuju /statistics, yang isinya memang perluasan dari angka yang dipajang.
   */
  it('ketiga kartu menjadi tautan ke halaman statistik', async () => {
    getStatistics.mockResolvedValue(DATA);

    render(<KartuStatistikHero />);
    await screen.findByTestId('nilai-ikm');

    const tautan = screen.getAllByRole('link');
    expect(tautan).toHaveLength(3);
    tautan.forEach((t) => expect(t).toHaveAttribute('href', '/statistics'));
  });

  /**
   * Kartunya mengayun 13px naik-turun. Tanpa jeda ini, membaca angkanya berarti
   * mengejar sasaran yang bergerak -- hover-nya jadi hiasan, bukan bantuan.
   */
  it('ayunan berhenti saat kartunya disentuh kursor', async () => {
    getStatistics.mockResolvedValue(DATA);

    const { container } = render(<KartuStatistikHero />);
    await screen.findByTestId('nilai-ikm');

    const melayang = container.querySelectorAll('[class*="animate-melayang"]');
    expect(melayang.length).toBeGreaterThan(0);
    melayang.forEach((el) => expect(el.className).toMatch(/hover:\[animation-play-state:paused\]/));
  });

  /**
   * PASANGAN kontrol. Kartu pernyataan muncul justru KETIKA /statistics gagal
   * dihubungi -- menautkannya ke halaman yang datanya berasal dari endpoint yang
   * sama berarti mengirim pengunjung ke halaman yang hampir pasti ikut kosong.
   */
  it('KONTROL: kartu pernyataan saat gagal BUKAN tautan', async () => {
    getStatistics.mockRejectedValue(new Error('jaringan putus'));

    render(<KartuStatistikHero />);
    await screen.findByText(/terhubung sso madiun/i);

    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });

  it('tidak memuat satu pun gambar atau alamat luar', async () => {
    getStatistics.mockResolvedValue(DATA);

    const { container } = render(<KartuStatistikHero />);
    await screen.findByTestId('nilai-ikm');

    expect(container.querySelectorAll('img')).toHaveLength(0);
    const luar = Array.from(container.querySelectorAll('[src], [href]')).filter((el) =>
      /^(https?:)?\/\//.test(el.getAttribute('src') || el.getAttribute('href') || ''),
    );
    expect(luar).toHaveLength(0);
  });

  /**
   * Terukur di peramban sebelum perbaikan: `outlineStyle: none` pada ketiga
   * tautan, `boxShadow: none`, dan satu-satunya isyarat fokus adalah angkat 4px
   * -- sementara pengguna TETIKUS, yang tak membutuhkan petunjuk, justru
   * mendapat bayangan yang ikut memekat. Yang ditahan uji ini bukan nama kelas
   * tertentu melainkan aturannya: siapa pun yang mematikan outline bawaan wajib
   * memasang penggantinya.
   */
  it('tautan yang mematikan outline wajib punya cincin fokus pengganti', async () => {
    getStatistics.mockResolvedValue(DATA);

    render(<KartuStatistikHero />);
    await screen.findByTestId('nilai-ikm');

    const tautan = screen.getAllByRole('link');
    expect(tautan).toHaveLength(3);
    tautan.forEach((t) => {
      if (/outline-none/.test(t.className)) {
        expect(t.className).toMatch(/focus-visible:ring-2/);
      }
    });
  });

  /**
   * `text-slate-400` (#94a3b8) di atas latar kartu -- yang sampel pikselnya
   * terukur #F9F9FE, praktis putih -- memberi rasio 2,44:1. Ambang AA adalah 4,5
   * untuk teks biasa dan 3,0 untuk teks besar, jadi ia gagal keduanya. Yang
   * terkena justru LABEL yang menerangkan angkanya, sementara angkanya sendiri
   * lolos: yang terbaca adalah bilangannya, yang tidak adalah artinya.
   */
  it('tak memakai warna teks yang gagal kontras AA', async () => {
    getStatistics.mockResolvedValue(DATA);

    const { container } = render(<KartuStatistikHero />);
    await screen.findByTestId('nilai-ikm');

    expect(container.innerHTML).not.toMatch(/text-slate-400/);
  });

  /**
   * Kartu pernyataan hanya muncul saat jaringannya putus, jadi uji jalur sukses
   * di atas tak pernah menyentuhnya -- terbukti lewat mutasi: mengembalikan
   * labelnya ke `text-slate-400` tak memerahkan satu uji pun. Justru di keadaan
   * inilah teksnya paling perlu terbaca, karena hanya kalimat itu yang tersisa
   * untuk menjelaskan apa yang sedang terjadi.
   */
  it('kartu pernyataan saat gagal juga lolos kontras AA', async () => {
    getStatistics.mockRejectedValue(new Error('jaringan putus'));

    const { container } = render(<KartuStatistikHero />);
    await screen.findByText(/terhubung sso madiun/i);

    expect(container.innerHTML).not.toMatch(/text-slate-400/);
  });

  /**
   * Label periode terukur 9px dan label chip 10px. Kontras yang lolos tak
   * menolong teks yang terlalu kecil untuk dibaca.
   */
  it('tak ada teks di bawah 11px', async () => {
    getStatistics.mockResolvedValue(DATA);

    const { container } = render(<KartuStatistikHero />);
    await screen.findByTestId('nilai-ikm');

    const ukuran = (container.innerHTML.match(/text-\[(\d+)px\]/g) ?? []).map((k) =>
      Number(k.match(/\d+/)[0]),
    );
    expect(ukuran.length).toBeGreaterThan(0);
    expect(ukuran.filter((px) => px < 11)).toEqual([]);
  });

  /**
   * Nilai IKM se-kabupaten yang dihitung dari lima penilaian bukan laporan,
   * melainkan kebetulan. Halaman utama memajangnya sebagai angka terbesar dan
   * pembacanya tak punya cara tahu bahwa dasarnya setipis itu. Ini bukan soal
   * data pengembangan: komponennya tak punya lantai batas sama sekali, jadi
   * instalasi produksi yang baru akan berperilaku persis sama.
   */
  it('nilai IKM tak dipajang selagi penilaiannya belum cukup', async () => {
    getStatistics.mockResolvedValue({
      ...DATA,
      summary: { ...DATA.summary, totalRespondents: 5 },
    });

    render(<KartuStatistikHero />);
    await screen.findByText(/belum cukup penilaian/i);

    expect(screen.queryByTestId('nilai-ikm')).not.toBeInTheDocument();
    expect(screen.queryByText('91,2')).not.toBeInTheDocument();
    // Jumlah sebenarnya tetap disebut. Itu yang membuatnya ajakan ikut menilai,
    // bukan sekadar kolom yang dikosongkan tanpa penjelasan.
    expect(screen.getByText(/5 dari 30/i)).toBeInTheDocument();
  });

  /**
   * PASANGAN batas. Ambangnya harus `>=`, bukan `>`: tepat pada 30 nilainya
   * sudah boleh tampil. Tanpa uji ini kedua operator sama-sama lolos.
   */
  it('BATAS: tepat pada ambang, nilainya sudah dipajang', async () => {
    getStatistics.mockResolvedValue({
      ...DATA,
      summary: { ...DATA.summary, totalRespondents: 30 },
    });

    render(<KartuStatistikHero />);

    expect(await screen.findByTestId('nilai-ikm')).toHaveTextContent('91,2');
  });

  /**
   * Jaminan bahwa kartunya benar-benar sampai ke layar ponsel -- beserta keadaan
   * memuat dan gagalnya -- pindah ke KartuHeroPonsel.test.jsx sejak 16 September
   * 2026. Strip ringkasan yang dulu diuji di sini sudah tak ada: kartunya sendiri
   * yang kini tampil di layar sempit.
   */
});
