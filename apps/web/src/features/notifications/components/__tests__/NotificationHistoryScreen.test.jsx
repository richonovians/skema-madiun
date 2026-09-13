import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { setupServer } from 'msw/node';
import { handlers, ok, paginated, notificationFixture } from '@/mocks/handlers';
import NotificationHistoryScreen from '../NotificationHistoryScreen';

/**
 * Permintaan pengguna 13 September 2026: "tambahkan halaman dan tombol pada
 * notifikasi untuk melihat semua histori notifikasi agar dapat melihat notif
 * yang sudah lama hingga terbaru".
 *
 * Dropdown hanya mengambil 10 teratas dan tak punya jalan ke sisanya. Backend
 * sudah mendukung `page`/`limit`/`unreadOnly` beserta meta paginasi, jadi yang
 * diuji di sini murni layarnya: apakah ia benar-benar meminta halaman
 * berikutnya, dan apakah saringan "belum dibaca" sampai ke permintaan.
 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const NOW = new Date('2026-09-13T10:00:00.000Z').getTime();
const menitLalu = (n) => new Date(NOW - n * 60_000).toISOString();

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const BARU = notificationFixture({
  id: 1,
  type: 'survey_response_created',
  title: 'Survei Mulai Menerima Jawaban',
  message: 'Survei "SKM Loket" menerima jawaban pertama',
  link: '/admin-opd/surveys/7/responses',
  isRead: false,
  createdAt: menitLalu(5),
});

const LAMA = notificationFixture({
  id: 2,
  type: 'complaint_created',
  title: 'Pengaduan Baru Masuk',
  message: 'Pengaduan baru PGD20260101AAAA masuk',
  link: null,
  isRead: true,
  createdAt: menitLalu(60 * 24 * 120),
});

describe('NotificationHistoryScreen', () => {
  let nowSpy;

  beforeEach(() => {
    nowSpy = jest.spyOn(Date, 'now').mockReturnValue(NOW);
  });
  afterEach(() => nowSpy.mockRestore());

  /** Rekam setiap query yang dikirim ke GET /notifications. */
  const rekamPermintaan = (list = [BARU, LAMA], { total = 2, limit = 20 } = {}) => {
    const query = [];
    server.use(
      http.get(`${API_BASE}/notifications`, ({ request }) => {
        const url = new URL(request.url);
        query.push(Object.fromEntries(url.searchParams));
        // Menirukan backend: saat `unreadOnly`, baris DAN `total` yang kembali
        // adalah yang belum dibaca saja. Mock yang mengembalikan total penuh
        // apa pun saringannya membuat uji "angka Semua tidak ikut menyusut"
        // hampa -- mutasinya sempat lolos hijau karena itu.
        const unreadOnly = url.searchParams.get('unreadOnly') === 'true';
        // `from` ikut ditirukan karena alasan yang sama: mock yang mengabaikan
        // batas waktu membuat uji "angka pil ikut menyaring" hijau bahkan saat
        // komponennya lupa meneruskan batas itu.
        const from = url.searchParams.get('from');
        let items = from
          ? list.filter((n) => new Date(n.createdAt) >= new Date(from))
          : list;
        if (unreadOnly) items = items.filter((n) => !n.isRead);
        return paginated(items, '/notifications', {
          page: Number(url.searchParams.get('page') ?? 1),
          limit,
          total: unreadOnly || from ? items.length : total,
        });
      }),
      http.get(`${API_BASE}/notifications/unread-count`, () =>
        ok({ count: 1 }, '/notifications/unread-count'),
      ),
    );
    return query;
  };

  /**
   * Permintaan DAFTAR yang terakhir dikirim.
   *
   * Sejak angka pil ikut menyaring (13 September 2026), tiap pemuatan mengirim
   * DUA permintaan ke `/notifications`: daftarnya sendiri, dan satu lagi
   * ber-`limit: 1` yang cuma diambil angkanya untuk pil pasangannya. Keduanya
   * berjalan bersamaan, jadi "permintaan terakhir" tak lagi berarti "daftarnya"
   * -- permintaan angka SELALU `page: 1` dan akan menutupi halaman yang sedang
   * diuji.
   */
  const daftarTerakhir = (query) => [...query].reverse().find((q) => q.limit !== '1');

  it('menampilkan notifikasi lama maupun terbaru dalam satu daftar', async () => {
    rekamPermintaan();
    render(<NotificationHistoryScreen dashboardHref="/admin-opd/dashboard" />);

    expect(await screen.findByText('Survei Mulai Menerima Jawaban')).toBeInTheDocument();
    expect(screen.getByText('Pengaduan Baru Masuk')).toBeInTheDocument();
  });

  /**
   * Inilah yang membedakan halaman ini dari dropdown: dropdown terkunci di 10
   * teratas, sedangkan halaman ini harus benar-benar meminta halaman berikutnya.
   */
  it('meminta halaman berikutnya ke backend, bukan memotong daftar di klien', async () => {
    const query = rekamPermintaan([BARU, LAMA], { total: 45 });
    render(<NotificationHistoryScreen dashboardHref="/admin-opd/dashboard" />);

    await screen.findByText('Survei Mulai Menerima Jawaban');
    expect(query[0].page).toBe('1');

    fireEvent.click(screen.getByRole('button', { name: /berikutnya|selanjutnya|next/i }));

    await waitFor(() => expect(query.length).toBeGreaterThan(1));
    expect(daftarTerakhir(query).page).toBe('2');
  });

  it('saringan "belum dibaca" diteruskan ke permintaan, bukan disaring di klien', async () => {
    const query = rekamPermintaan();
    render(<NotificationHistoryScreen dashboardHref="/admin-opd/dashboard" />);

    await screen.findByText('Survei Mulai Menerima Jawaban');
    fireEvent.click(screen.getByRole('button', { name: /belum dibaca/i }));

    await waitFor(() =>
      expect(query.some((q) => q.unreadOnly === 'true' || q.unreadOnly === true)).toBe(true),
    );
  });

  it('kembali ke halaman 1 saat saringan diubah', async () => {
    const query = rekamPermintaan([BARU, LAMA], { total: 45 });
    render(<NotificationHistoryScreen dashboardHref="/admin-opd/dashboard" />);

    await screen.findByText('Survei Mulai Menerima Jawaban');
    fireEvent.click(screen.getByRole('button', { name: /berikutnya|selanjutnya|next/i }));
    await waitFor(() => expect(daftarTerakhir(query).page).toBe('2'));

    fireEvent.click(screen.getByRole('button', { name: /belum dibaca/i }));

    // Tanpa ini, saringan baru dibuka pada halaman 2 yang mungkin sudah kosong,
    // dan pengguna melihat daftar hampa padahal datanya ada.
    await waitFor(() => expect(daftarTerakhir(query).page).toBe('1'));
  });

  it('notifikasi bertaut dirender sebagai tautan ke alamatnya', async () => {
    rekamPermintaan();
    render(<NotificationHistoryScreen dashboardHref="/admin-opd/dashboard" />);

    const tautan = await screen.findByRole('link', { name: /Survei Mulai Menerima Jawaban/i });
    expect(tautan).toHaveAttribute('href', '/admin-opd/surveys/7/responses');
  });

  it('daftar kosong menjelaskan keadaannya, bukan diam', async () => {
    rekamPermintaan([], { total: 0 });
    render(<NotificationHistoryScreen dashboardHref="/admin-opd/dashboard" />);

    expect(await screen.findByText(/belum ada notifikasi/i)).toBeInTheDocument();
  });

  it('tombol tandai semua dibaca memanggil backend lalu memuat ulang', async () => {
    const query = rekamPermintaan();
    let dipanggil = 0;
    server.use(
      http.patch(`${API_BASE}/notifications/read-all`, () => {
        dipanggil += 1;
        return ok({ updated: 1 }, '/notifications/read-all');
      }),
    );
    render(<NotificationHistoryScreen dashboardHref="/admin-opd/dashboard" />);

    await screen.findByText('Survei Mulai Menerima Jawaban');
    const sebelum = query.length;
    fireEvent.click(screen.getByRole('button', { name: /tandai semua dibaca/i }));

    await waitFor(() => expect(dipanggil).toBe(1));
    await waitFor(() => expect(query.length).toBeGreaterThan(sebelum));
  });

  /**
   * 13 September 2026, laporan pengguna "tampilan riwayat notifikasi masih
   * kurang bagus" beserta tangkapan layar: judul menempel tepi kiri dan tautan
   * "Kembali ke dasbor" terpotong di kanan.
   *
   * Sebabnya terbukti di layout, bukan selera: `(respondent)/layout.jsx` tak
   * memberi padding maupun pembatas lebar sama sekali -- ketiga halaman warga
   * lain menyediakannya sendiri lewat `max-w-[1280px] mx-auto px-4 sm:px-6`,
   * dan halaman ini tidak.
   */
  describe('rupa', () => {
    const akar = (container) => container.firstChild;

    it('membatasi lebar isi, supaya tak ada yang terpotong di tepi', async () => {
      rekamPermintaan();
      const { container } = render(<NotificationHistoryScreen dashboardHref="/dashboard" />);

      await screen.findByText('Survei Mulai Menerima Jawaban');
      expect(akar(container).className).toMatch(/max-w-\[1280px\]/);
      expect(akar(container).className).toMatch(/mx-auto/);
    });

    it('pemanggil masih dapat menambah kelasnya sendiri tanpa kehilangan pembatas', async () => {
      rekamPermintaan();
      const { container } = render(
        <NotificationHistoryScreen dashboardHref="/dashboard" className="px-4 sm:px-6" />,
      );

      await screen.findByText('Survei Mulai Menerima Jawaban');
      expect(akar(container).className).toMatch(/max-w-\[1280px\]/);
      expect(akar(container).className).toMatch(/px-4/);
    });

    /**
     * Pembeda jenis. Tanpa ini tiga "Pengaduan Baru Masuk" beruntun berbentuk
     * persis sama dan daftar terbaca sebagai dinding teks.
     *
     * Ikonnya sendiri `aria-hidden`: ia MENGULANG isi judul, jadi membacakannya
     * hanya menggandakan informasi yang sama bagi pembaca layar. Yang diuji di
     * sini karena itu sifat visualnya -- dua jenis berbeda harus benar-benar
     * tampil berbeda, bukan sekadar punya penanda di markup.
     */
    it('jenis yang berbeda tampil berbeda, dan ikonnya tak dibacakan dua kali', async () => {
      rekamPermintaan();
      const { container } = render(<NotificationHistoryScreen dashboardHref="/dashboard" />);
      await screen.findByText('Survei Mulai Menerima Jawaban');

      const survei = container.querySelector('[data-jenis="survey_response_created"]');
      const pengaduan = container.querySelector('[data-jenis="complaint_created"]');
      expect(survei).toBeTruthy();
      expect(pengaduan).toBeTruthy();
      expect(survei.className).not.toBe(pengaduan.className);
      expect(survei).toHaveAttribute('aria-hidden', 'true');
    });

    /**
     * Penanda belum dibaca sebelumnya cuma titik 8px di atas latar 5% -- pada
     * tangkapan layar pengguna ia tak terbaca sama sekali, padahal ada saringan
     * "Belum dibaca" yang menjanjikan pembedaan itu.
     */
    it('baris belum dibaca ditandai jelas, yang sudah dibaca tidak', async () => {
      rekamPermintaan();
      render(<NotificationHistoryScreen dashboardHref="/dashboard" />);

      await screen.findByText('Survei Mulai Menerima Jawaban');
      // Disaring ke yang BERADA DI DALAM BARIS: "Belum dibaca" juga nama tombol
      // saringan di atasnya. Tak bisa dilingkupi ke satu `list` -- sejak baris
      // dikelompokkan per tanggal, daftarnya lebih dari satu.
      const penanda = screen
        .getAllByText('Belum dibaca')
        .filter((el) => el.closest('li') !== null);

      // Tepat satu: yang sudah dibaca tak boleh ikut menyandangnya.
      expect(penanda).toHaveLength(1);
      expect(penanda[0].closest('li')).toHaveTextContent('Survei Mulai Menerima Jawaban');
    });


    /**
     * Tahap (3). Tanpa pemisah, dua puluh baris mengalir tanpa pegangan:
     * pada potret nyata "5 jam lalu", "Kemarin", "3 hari lalu", dan
     * "18 Agu 2026" berderet tanpa satu pun batas.
     */
    it('memberi kepala kelompok menurut kapan notifikasinya datang', async () => {
      const lama = notificationFixture({
        id: 9,
        type: 'complaint_created',
        title: 'Pengaduan Lawas',
        message: 'Pengaduan lama',
        link: null,
        isRead: true,
        createdAt: new Date(NOW - 60 * 24 * 120 * 60_000).toISOString(),
      });
      rekamPermintaan([BARU, lama]);
      render(<NotificationHistoryScreen dashboardHref="/dashboard" />);

      await screen.findByText('Survei Mulai Menerima Jawaban');
      expect(screen.getByText('Hari ini')).toBeInTheDocument();
      // 120 hari lalu dari 13 September 2026 jatuh di Mei 2026.
      expect(screen.getByText('Mei 2026')).toBeInTheDocument();
    });

    it('kepala kelompok tidak muncul saat daftar kosong', async () => {
      rekamPermintaan([], { total: 0 });
      render(<NotificationHistoryScreen dashboardHref="/dashboard" />);

      await screen.findByText(/belum ada notifikasi/i);
      expect(screen.queryByText('Hari ini')).not.toBeInTheDocument();
    });

    /**
     * Judul terpotong di ponsel ("Balasan Baru pada Pe...") -- terlihat pada
     * potret 390px, bukan dari membaca kode. `truncate` memotong pada satu
     * baris; judul notifikasi memang perlu dua baris di layar sempit.
     */
    it('judul panjang dibiarkan turun baris, bukan dipotong satu baris', async () => {
      const panjang = notificationFixture({
        id: 10,
        type: 'complaint_reply',
        title: 'Balasan Baru pada Pengaduan Mengenai Jalan Rusak di Depan Balai Desa',
        isRead: true,
        createdAt: menitLalu(5),
      });
      rekamPermintaan([panjang]);
      const { container } = render(<NotificationHistoryScreen dashboardHref="/dashboard" />);

      await screen.findByText(panjang.title);
      const judul = container.querySelector('[data-judul-notifikasi]');
      expect(judul.className).not.toMatch(/truncate/);
      expect(judul.className).toMatch(/line-clamp-2/);
    });

    it('waktu tetap tampil pada tiap baris', async () => {
      rekamPermintaan();
      render(<NotificationHistoryScreen dashboardHref="/dashboard" />);

      expect(await screen.findByText('5 menit lalu')).toBeInTheDocument();
    });
  });

  /**
   * Tahap (1) & (2). Kepala halaman sebelumnya hanya judul, satu baris
   * keterangan, dan satu tautan -- tak ada apa pun yang menjawab "apakah ada
   * yang perlu saya tangani". Saringannya pun tanpa angka, sehingga Anda harus
   * mengkliknya dulu untuk tahu isinya ada berapa, bahkan untuk tahu ada.
   */
  describe('ringkasan & angka saringan', () => {
    it('menyebut berapa yang belum dibaca di kepala halaman', async () => {
      rekamPermintaan();
      render(<NotificationHistoryScreen dashboardHref="/dashboard" />);

      expect(await screen.findByText(/1 belum dibaca/i)).toBeInTheDocument();
    });

    it('saat semua sudah dibaca, dikatakan begitu -- bukan angka nol', async () => {
      rekamPermintaan([LAMA], { total: 1 });
      server.use(
        http.get(`${API_BASE}/notifications/unread-count`, () =>
          ok({ count: 0 }, '/notifications/unread-count'),
        ),
      );
      render(<NotificationHistoryScreen dashboardHref="/dashboard" />);

      expect(await screen.findByText(/semua sudah dibaca/i)).toBeInTheDocument();
      expect(screen.queryByText(/0 belum dibaca/i)).not.toBeInTheDocument();
    });

    it('tombol saringan membawa jumlahnya masing-masing', async () => {
      rekamPermintaan([BARU, LAMA], { total: 45 });
      render(<NotificationHistoryScreen dashboardHref="/dashboard" />);

      expect(await screen.findByRole('button', { name: /semua \(45\)/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /belum dibaca \(1\)/i })).toBeInTheDocument();
    });

    /**
     * Saat menyaring, `pagination.total` yang kembali adalah jumlah YANG BELUM
     * DIBACA, bukan jumlah seluruhnya -- memakainya apa adanya akan membuat
     * "Semua" ikut menyusut jadi angka yang salah.
     */
    it('angka "Semua" tidak ikut menyusut saat saringan belum dibaca aktif', async () => {
      rekamPermintaan([BARU, LAMA], { total: 45 });
      render(<NotificationHistoryScreen dashboardHref="/dashboard" />);

      await screen.findByRole('button', { name: /semua \(45\)/i });
      fireEvent.click(screen.getByRole('button', { name: /belum dibaca/i }));

      await waitFor(() =>
        expect(screen.getByRole('button', { name: /belum dibaca \(1\)/i })).toBeInTheDocument(),
      );
      expect(screen.getByRole('button', { name: /semua \(45\)/i })).toBeInTheDocument();
    });

    it('jumlah disegarkan sesudah menandai semua dibaca', async () => {
      rekamPermintaan();
      let sudahDitandai = false;
      server.use(
        http.patch(`${API_BASE}/notifications/read-all`, () => {
          sudahDitandai = true;
          return ok({ updated: 1 }, '/notifications/read-all');
        }),
        http.get(`${API_BASE}/notifications/unread-count`, () =>
          ok({ count: sudahDitandai ? 0 : 1 }, '/notifications/unread-count'),
        ),
      );
      render(<NotificationHistoryScreen dashboardHref="/dashboard" />);

      await screen.findByText(/1 belum dibaca/i);
      fireEvent.click(screen.getByRole('button', { name: /tandai semua dibaca/i }));

      expect(await screen.findByText(/semua sudah dibaca/i)).toBeInTheDocument();
    });
  });

  /**
   * Tahap (4), (5), (6).
   */
  describe('afordans, hierarki, dan keadaan memuat', () => {
    it('tiap baris membawa isyarat bahwa ia menuju suatu tempat', async () => {
      rekamPermintaan();
      const { container } = render(<NotificationHistoryScreen dashboardHref="/dashboard" />);

      await screen.findByText('Survei Mulai Menerima Jawaban');
      const panah = container.querySelectorAll('[data-panah]');
      expect(panah).toHaveLength(2);
      // Murni visual: tujuannya sudah terbaca dari judul & pesannya.
      expect(panah[0]).toHaveAttribute('aria-hidden', 'true');
    });

    /**
     * Yang sudah dibaca diredupkan supaya yang belum menonjol tanpa perlu
     * berteriak. Kalau keduanya bergaya sama, garis aksen sendirian yang
     * menanggung seluruh beda -- dan itu tipis sekali di layar panjang.
     */
    it('judul yang sudah dibaca bergaya lain dari yang belum', async () => {
      rekamPermintaan();
      const { container } = render(<NotificationHistoryScreen dashboardHref="/dashboard" />);

      await screen.findByText('Survei Mulai Menerima Jawaban');
      const judul = [...container.querySelectorAll('[data-judul-notifikasi]')];
      const belum = judul.find((el) => el.textContent === BARU.title);
      const sudah = judul.find((el) => el.textContent === LAMA.title);

      expect(belum.className).not.toBe(sudah.className);
      expect(belum.className).toMatch(/font-semibold/);
    });

    /**
     * Rangka, bukan pemintal: pemintal tak berukuran, jadi tata letak melompat
     * begitu datanya tiba.
     */
    it('memuat ditampilkan sebagai rangka baris, bukan pemintal', () => {
      rekamPermintaan();
      const { container } = render(<NotificationHistoryScreen dashboardHref="/dashboard" />);

      // Diperiksa SEBELUM menunggu apa pun -- inilah keadaan sesaat itu.
      expect(container.querySelectorAll('[data-rangka]').length).toBeGreaterThan(0);
    });

    it('rangka hilang begitu datanya tiba', async () => {
      rekamPermintaan();
      const { container } = render(<NotificationHistoryScreen dashboardHref="/dashboard" />);

      await screen.findByText('Survei Mulai Menerima Jawaban');
      expect(container.querySelectorAll('[data-rangka]')).toHaveLength(0);
    });
  });

  /**
   * Dua laporan pengguna 13 September 2026 pada tautan yang sama.
   *
   * Sebutannya dilengkapi jadi "Dashboard": itulah kata yang dipakai sidebar
   * Kabupaten, sidebar OPD, dan menu profil ("Dashboard Saya"), sehingga
   * "dasbor" justru satu-satunya sebutan yang menyimpang di aplikasi ini.
   */
  describe('tautan kembali', () => {
    const tautan = () => screen.getByRole('link', { name: /Kembali ke Dashboard/i });

    it('menyebut "Dashboard" dan menuju alamat yang diberikan pemanggil', async () => {
      rekamPermintaan();
      render(<NotificationHistoryScreen dashboardHref="/admin-kab/dashboard" />);

      await screen.findByText('Survei Mulai Menerima Jawaban');
      expect(tautan()).toHaveAttribute('href', '/admin-kab/dashboard');
    });

    /**
     * Bentuknya tombol, bukan teks bergaris bawah. Ia berdiri sendirian di
     * sudut kanan kepala halaman, jauh dari kalimat mana pun, jadi tak ada apa
     * pun di sekitarnya yang memberitahu bahwa ia dapat ditekan.
     */
    it('tampil sebagai tombol berbingkai, lengkap dengan ikon arah', async () => {
      rekamPermintaan();
      render(<NotificationHistoryScreen dashboardHref="/dashboard" />);

      await screen.findByText('Survei Mulai Menerima Jawaban');
      expect(tautan().className).toMatch(/border/);
      expect(tautan().className).toMatch(/rounded/);
      expect(tautan().querySelector('svg')).not.toBeNull();
    });

    /**
     * Sesuatu yang berbentuk tombol tetapi tak menampakkan apa pun saat di-Tab
     * adalah cacat, bukan selera: penggunanya kehilangan jejak posisi.
     */
    it('menampakkan keadaan fokus bagi pengguna papan tik', async () => {
      rekamPermintaan();
      render(<NotificationHistoryScreen dashboardHref="/dashboard" />);

      await screen.findByText('Survei Mulai Menerima Jawaban');
      expect(tautan().className).toMatch(/focus-visible:/);
    });
  });

  /**
   * Saring rentang waktu & urutan (permintaan pengguna 13 September 2026).
   *
   * Kepala kelompok tanggal hanya menata 20 baris yang sedang tampil; saringan
   * inilah yang memperkecil SELURUH kumpulan. Karena itu yang diuji di sini
   * adalah apakah batasnya benar-benar sampai ke backend -- menyaring di klien
   * hanya akan menyaring satu halaman, persis cacat yang membuat halaman ini
   * dibangun menggantikan dropdown lonceng.
   */
  describe('saringan waktu & urutan', () => {
    const LAMA_BELUM_DIBACA = notificationFixture({
      id: 3,
      type: 'complaint_reply',
      title: 'Balasan Lama Belum Dibaca',
      message: 'Balasan lama yang belum sempat dibuka',
      link: null,
      isRead: false,
      createdAt: menitLalu(60 * 24 * 100),
    });

    /** Opsi dropdown dirender sebagai <button>; pemicunya juga. Label tujuan selalu dipilih yang tak sama dengan nilai aktif. */
    const pilih = (pemicu, opsi) => {
      fireEvent.click(screen.getByText(pemicu));
      fireEvent.click(screen.getAllByText(opsi).find((el) => el.closest('button') !== null));
    };

    it('memilih rentang waktu mengirim batas `from` ke backend', async () => {
      const query = rekamPermintaan();
      render(<NotificationHistoryScreen dashboardHref="/dashboard" />);

      await screen.findByText('Survei Mulai Menerima Jawaban');
      expect(query[0].from).toBeUndefined();

      pilih('Semua waktu', 'Tahun ini');

      await waitFor(() => expect(daftarTerakhir(query).from).toBeDefined());
      expect(new Date(daftarTerakhir(query).from).getFullYear()).toBe(
        new Date(NOW).getFullYear(),
      );
    });

    it('memilih urutan terlama mengirim sort=asc', async () => {
      const query = rekamPermintaan();
      render(<NotificationHistoryScreen dashboardHref="/dashboard" />);

      await screen.findByText('Survei Mulai Menerima Jawaban');
      expect(query[0].sort).toBeUndefined();

      pilih('Terbaru dulu', 'Terlama dulu');

      await waitFor(() => expect(daftarTerakhir(query).sort).toBe('asc'));
    });

    it('kembali ke halaman 1 saat rentang waktu diubah', async () => {
      const query = rekamPermintaan([BARU, LAMA], { total: 45 });
      render(<NotificationHistoryScreen dashboardHref="/dashboard" />);

      await screen.findByText('Survei Mulai Menerima Jawaban');
      fireEvent.click(screen.getByRole('button', { name: /berikutnya|selanjutnya|next/i }));
      await waitFor(() => expect(daftarTerakhir(query).page).toBe('2'));

      pilih('Semua waktu', 'Tahun ini');

      await waitFor(() => expect(daftarTerakhir(query).page).toBe('1'));
    });

    /**
     * Angka pil harus menggambarkan yang sedang dilihat. Kalau ia tetap global
     * saat saringan aktif, pilnya menyebut angka yang tak ada hubungannya
     * dengan daftar di bawahnya -- terbaca sebagai cacat, bukan sebagai angka.
     */
    it('angka pada kedua pil ikut menyaring saat rentang waktu aktif', async () => {
      rekamPermintaan([BARU, LAMA, LAMA_BELUM_DIBACA], { total: 45 });
      render(<NotificationHistoryScreen dashboardHref="/dashboard" />);

      await screen.findByText('Survei Mulai Menerima Jawaban');
      expect(screen.getByRole('button', { name: 'Semua (45)' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Belum dibaca (2)' })).toBeInTheDocument();

      pilih('Semua waktu', '30 hari terakhir');

      // Hanya BARU yang lahir dalam 30 hari terakhir, dan ia belum dibaca.
      expect(await screen.findByRole('button', { name: 'Semua (1)' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Belum dibaca (1)' })).toBeInTheDocument();
    });

    /**
     * Keping di judul TETAP global: ia mencerminkan lonceng, dan lonceng tak
     * ikut tersaring. Bedanya dari pil karena itu disengaja, bukan kelalaian.
     */
    it('keping di judul tetap global meski rentang waktu aktif', async () => {
      rekamPermintaan([BARU, LAMA, LAMA_BELUM_DIBACA], { total: 45 });
      render(<NotificationHistoryScreen dashboardHref="/dashboard" />);

      await screen.findByText('Survei Mulai Menerima Jawaban');
      pilih('Semua waktu', '30 hari terakhir');

      await screen.findByRole('button', { name: 'Semua (1)' });
      // `unread-count` global dari mock bernilai 1, bukan hasil penyaringan.
      expect(screen.getByText('1 belum dibaca')).toBeInTheDocument();
    });

    it('tombol reset baru muncul setelah ada saringan yang tidak bawaan', async () => {
      rekamPermintaan();
      render(<NotificationHistoryScreen dashboardHref="/dashboard" />);

      await screen.findByText('Survei Mulai Menerima Jawaban');
      // Tombol reset yang selalu tampak padahal tak ada yang perlu direset
      // hanya menambah ramai pada bilah yang sudah padat di ponsel.
      expect(screen.queryByRole('button', { name: /reset filter/i })).not.toBeInTheDocument();

      pilih('Semua waktu', 'Tahun ini');

      expect(
        await screen.findByRole('button', { name: /reset filter/i }),
      ).toBeInTheDocument();
    });

    it('reset memulihkan rentang dan urutan ke bawaan sekaligus', async () => {
      const query = rekamPermintaan();
      render(<NotificationHistoryScreen dashboardHref="/dashboard" />);

      await screen.findByText('Survei Mulai Menerima Jawaban');
      pilih('Semua waktu', 'Tahun ini');
      await waitFor(() => expect(daftarTerakhir(query).from).toBeDefined());
      pilih('Terbaru dulu', 'Terlama dulu');
      await waitFor(() => expect(daftarTerakhir(query).sort).toBe('asc'));

      fireEvent.click(await screen.findByRole('button', { name: /reset filter/i }));

      await waitFor(() => {
        const akhir = daftarTerakhir(query);
        expect(akhir.from).toBeUndefined();
        expect(akhir.sort).toBeUndefined();
      });
      expect(screen.getByText('Semua waktu')).toBeInTheDocument();
      expect(screen.getByText('Terbaru dulu')).toBeInTheDocument();
    });
  });
});
