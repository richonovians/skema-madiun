import { muatLambang, pecahBaris, sikuPemindai, susunTataLetak } from '../posterQrSurvei';

/**
 * POSTER QR SURVEI (permintaan pengguna 22 September 2026). Unduhan QR tak lagi
 * berupa gambar QR polos, melainkan poster berisi judul survei, nama instansi,
 * QR, dan URL-nya.
 *
 * Yang diuji di sini HANYA pemecah barisnya, dan itu disengaja: jsdom tak
 * memiliki canvas sungguhan, sehingga penggambarannya tak dapat dijalankan di
 * Jest sama sekali. Pemecah baris dipisahkan sebagai fungsi murni dengan
 * fungsi pengukur yang disuntikkan, justru supaya bagian yang paling mungkin
 * salah -- judul panjang yang meluber keluar poster -- tetap dapat dibuktikan
 * tanpa peramban. Poster utuhnya diperiksa uji Playwright.
 *
 * Pengukur uji memakai jumlah karakter, jadi `maksLebar` di bawah dibaca
 * sebagai "sekian karakter" dan hasilnya terbaca langsung.
 */
const ukurKarakter = (teks) => teks.length;

describe('pecahBaris', () => {
  it('membiarkan teks pendek dalam satu baris', () => {
    expect(pecahBaris('Survei Kepuasan', 40, ukurKarakter, 2)).toEqual(['Survei Kepuasan']);
  });

  it('memecah pada batas kata, bukan di tengah kata', () => {
    const baris = pecahBaris('Survei Kepuasan Masyarakat Kabupaten Madiun', 20, ukurKarakter, 3);

    expect(baris).toEqual(['Survei Kepuasan', 'Masyarakat Kabupaten', 'Madiun']);
    for (const b of baris) expect(b.length).toBeLessThanOrEqual(20);
  });

  it('berhenti pada baris terakhir dan menandainya dengan elipsis', () => {
    const baris = pecahBaris('Survei Kepuasan Masyarakat Kabupaten Madiun', 20, ukurKarakter, 2);

    expect(baris).toHaveLength(2);
    expect(baris[baris.length - 1]).toMatch(/…$/);
  });

  /**
   * Judul yang dipotong TIDAK BOLEH lebih lebar daripada judul yang utuh.
   * Menambahkan "…" pada baris yang sudah mepet justru membuatnya meluber --
   * kegagalan yang tepat terjadi pada kasus yang seharusnya ditolong.
   */
  it('elipsisnya ikut diukur, sehingga baris terakhir tetap muat', () => {
    const baris = pecahBaris('Survei Kepuasan Masyarakat Kabupaten Madiun', 20, ukurKarakter, 2);

    for (const b of baris) expect(b.length).toBeLessThanOrEqual(20);
  });

  it('memotong satu kata yang lebih panjang daripada lebar poster', () => {
    const baris = pecahBaris('Pemberdayaanmasyarakatdesaterpadu', 12, ukurKarakter, 2);

    expect(baris).toHaveLength(1);
    expect(baris[0].length).toBeLessThanOrEqual(12);
    expect(baris[0]).toMatch(/…$/);
  });

  it('memperlakukan judul kosong sebagai tanpa baris', () => {
    expect(pecahBaris('', 40, ukurKarakter, 2)).toEqual([]);
    expect(pecahBaris(null, 40, ukurKarakter, 2)).toEqual([]);
  });

  it('merapikan spasi berlebih supaya tak melahirkan baris kosong', () => {
    expect(pecahBaris('  Survei   Kepuasan  ', 40, ukurKarakter, 2)).toEqual(['Survei Kepuasan']);
  });
});

/**
 * SIKU PEMINDAI (22 September 2026). Empat tanda sudut di sekeliling QR yang
 * menandai "ini untuk dipindai".
 *
 * INVARIAN YANG DIJAGA UJI INI: tak satu pun siku boleh masuk ke dalam kotak
 * QR. Di sekeliling kode ada zona sunyi -- area putih bersih yang dipakai
 * pemindai untuk mengenali batas kodenya -- dan hiasan yang menyerobot ke
 * sana membuat QR lebih sulit dipindai, bukan lebih menarik. Bingkai versi
 * sebelumnya melakukan tepat itu: `strokeRect` digambar persis di tepi QR.
 *
 * Ini juga satu-satunya cara membuktikannya tanpa mencetak lalu memindai
 * sungguhan. Geometrinya dipisah sebagai fungsi murni justru supaya dapat
 * diperiksa, bukan dipercaya.
 */
describe('sikuPemindai', () => {
  const KOTAK = { x: 200, y: 400, ukuran: 620 };
  const siku = () => sikuPemindai(KOTAK.x, KOTAK.y, KOTAK.ukuran);

  /** Benar-benar DI DALAM kotak: tepat di tepinya belum melanggar apa pun. */
  const diDalamKotak = (px, py) =>
    px > KOTAK.x && px < KOTAK.x + KOTAK.ukuran && py > KOTAK.y && py < KOTAK.y + KOTAK.ukuran;

  it('menghasilkan dua segmen untuk tiap sudut', () => {
    expect(siku()).toHaveLength(8);
  });

  it('tak satu pun segmen menyerobot ke dalam kotak QR', () => {
    for (const s of siku()) {
      // Ujung saja tidak cukup: segmen boleh berawal dan berakhir di luar
      // kotak sambil memotong melintasinya. Karena itu seluruh panjangnya
      // dicicipi.
      for (let t = 0; t <= 1; t += 0.05) {
        const px = s.x1 + (s.x2 - s.x1) * t;
        const py = s.y1 + (s.y2 - s.y1) * t;
        expect(diDalamKotak(px, py)).toBe(false);
      }
    }
  });

  it('menjaga jarak dari tepi kotak, tidak menempel', () => {
    const jarakTerdekat = Math.min(
      ...siku().flatMap((s) => [
        Math.min(KOTAK.x - s.x1, KOTAK.x - s.x2, s.x1 - (KOTAK.x + KOTAK.ukuran), s.x2 - (KOTAK.x + KOTAK.ukuran)),
        Math.min(KOTAK.y - s.y1, KOTAK.y - s.y2, s.y1 - (KOTAK.y + KOTAK.ukuran), s.y2 - (KOTAK.y + KOTAK.ukuran)),
      ].filter((n) => n > 0)),
    );

    expect(jarakTerdekat).toBeGreaterThan(0);
  });

  it('keempat sudut terwakili, bukan satu sudut digambar empat kali', () => {
    const sudut = new Set(siku().map((s) => `${s.x1},${s.y1}`));

    expect(sudut.size).toBe(4);
  });
});

describe('muatLambang', () => {
  const ImageAsli = global.Image;
  afterEach(() => {
    global.Image = ImageAsli;
  });

  /** Ganti `Image` dengan boneka yang memanggil balik sesuai `hasil`. */
  const bonekaGambar = (hasil) => {
    global.Image = class {
      set src(nilai) {
        this._src = nilai;
        setTimeout(() => (hasil === 'load' ? this.onload?.() : this.onerror?.()), 0);
      }
      get src() {
        return this._src;
      }
    };
  };

  it('memulangkan gambarnya bila berhasil dimuat', async () => {
    bonekaGambar('load');

    await expect(muatLambang('/images/lambang.png')).resolves.toBeTruthy();
  });

  /**
   * Lambang adalah hiasan, dan hiasan tak boleh mematikan unduhan. Bila
   * berkasnya hilang atau jaringannya tersendat, poster tetap harus tersusun
   * -- tanpa lambang, tetapi tetap turun.
   */
  it('memulangkan null bila gagal, bukan melempar', async () => {
    bonekaGambar('error');

    await expect(muatLambang('/images/hilang.png')).resolves.toBeNull();
  });

  it('tak mencoba memuat apa pun bila sumbernya kosong', async () => {
    bonekaGambar('error');

    await expect(muatLambang('')).resolves.toBeNull();
    await expect(muatLambang(null)).resolves.toBeNull();
  });
});

/**
 * TATA LETAK POSTER (22 September 2026, sesudah cacat dilaporkan pengguna).
 *
 * CACATNYA: judul tiga baris tertimpa kotak QR, dan ajakan "Pindai untuk
 * mengisi survei" hilang sama sekali -- QR digambar sesudahnya, jadi ia
 * menutupinya. Terukur dari tetapan tata letaknya sendiri: siku QR mulai pada
 * y=484, sedangkan baris ketiga judul beralas di y=502 dan ajakannya di y=596.
 *
 * SEBABNYA BUKAN ANGKA YANG MELESET. Judul tumbuh ke bawah dari titik tetap
 * sementara QR dipaku dari bawah -- dua jangkar yang tak saling tahu. Menggeser
 * angkanya hanya memindahkan ambang: judul empat kata lolos, lima kata
 * bertabrakan lagi.
 *
 * Karena itu tata letaknya diangkat menjadi wilayah-wilayah tetap, dan uji ini
 * menegakkan satu invarian untuk SETIAP panjang judul yang mungkin: tak ada dua
 * wilayah yang bertumpang tindih, dan tulisan tak pernah keluar dari wilayahnya
 * sendiri. Itu menutup seluruh kelas cacatnya, bukan satu judul yang kebetulan
 * panjang.
 */
describe('susunTataLetak', () => {
  const SEMUA_PANJANG = [0, 1, 2, 3];

  const bertumpang = (a, b) => a.atas < b.bawah && b.atas < a.bawah;

  it('tak satu pun wilayah bertumpang tindih, berapa pun baris judulnya', () => {
    // Pelanggarannya DIKUMPULKAN lalu dibandingkan dengan larik kosong, bukan
    // diasersi satu per satu: saat gagal, pesannya menyebut wilayah mana yang
    // bertabrakan dan pada berapa baris judul -- tepat yang dibutuhkan untuk
    // memperbaikinya tanpa membaca ulang tetapannya.
    const pelanggaran = [];

    for (const n of SEMUA_PANJANG) {
      const daftar = Object.entries(susunTataLetak(n).wilayah);
      for (let i = 0; i < daftar.length; i += 1) {
        for (let j = i + 1; j < daftar.length; j += 1) {
          const [namaA, a] = daftar[i];
          const [namaB, b] = daftar[j];
          if (bertumpang(a, b)) {
            pelanggaran.push(
              `${n} baris: ${namaA}(${a.atas}-${a.bawah}) x ${namaB}(${b.atas}-${b.bawah})`,
            );
          }
        }
      }
    }

    expect(pelanggaran).toEqual([]);
  });

  it('seluruh wilayah berada di dalam kanvas', () => {
    for (const n of SEMUA_PANJANG) {
      const { wilayah, tinggiKanvas } = susunTataLetak(n);
      const salah = Object.entries(wilayah)
        .filter(([, w]) => w.atas < 0 || w.bawah > tinggiKanvas || w.bawah <= w.atas)
        .map(([nama, w]) => `${n} baris: ${nama}(${w.atas}-${w.bawah})`);

      expect(salah).toEqual([]);
    }
  });

  /**
   * INI YANG SEBENARNYA GAGAL KEMARIN. Wilayah boleh rapi di atas kertas
   * hitungan, tetapi bila tulisannya digambar melampaui kotaknya sendiri,
   * tabrakannya kembali persis seperti semula. Yang diperiksa kotak TINTA
   * judulnya -- dari puncak huruf baris pertama sampai ekor huruf baris
   * terakhir -- bukan sekadar garis alasnya.
   */
  it('kotak tinta judul tak pernah keluar dari wilayah judul', () => {
    for (const n of SEMUA_PANJANG) {
      if (n === 0) continue;
      const { wilayah, blokJudul } = susunTataLetak(n);

      const meluber =
        blokJudul.atas < wilayah.judul.atas || blokJudul.bawah > wilayah.judul.bawah;

      expect({ n, meluber }).toEqual({ n, meluber: false });
    }
  });

  it('memusatkan judul secara tegak di dalam wilayahnya', () => {
    const { wilayah, blokJudul } = susunTataLetak(1);
    const sisaAtas = blokJudul.atas - wilayah.judul.atas;
    const sisaBawah = wilayah.judul.bawah - blokJudul.bawah;

    expect(Math.abs(sisaAtas - sisaBawah)).toBeLessThanOrEqual(1);
  });

  /**
   * KONTROL: tanpa ini, fungsi yang memulangkan wilayah setebal nol piksel
   * akan lolos seluruh uji di atas tanpa melanggar apa pun.
   */
  it('KONTROL: QR mendapat ruang yang benar-benar dapat dipindai', () => {
    const { wilayah } = susunTataLetak(3);

    expect(wilayah.qr.bawah - wilayah.qr.atas).toBeGreaterThanOrEqual(480);
  });

  it('KONTROL: garis alas tiap baris judul dipulangkan, satu per baris', () => {
    expect(susunTataLetak(3).garisJudul).toHaveLength(3);
    expect(susunTataLetak(1).garisJudul).toHaveLength(1);
    expect(susunTataLetak(0).garisJudul).toHaveLength(0);
  });
});
