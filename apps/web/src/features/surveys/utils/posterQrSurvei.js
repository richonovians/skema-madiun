/**
 * Poster QR survei (22 September 2026, permintaan pengguna).
 *
 * Unduhan QR sebelumnya berupa berkas PNG berisi kotak QR saja. Dicetak dan
 * ditempel di loket, gambar itu tak memberi tahu apa pun: yang lewat tak tahu
 * survei apa, milik instansi mana, dan tak punya cara membukanya bila kameranya
 * tak mau memindai. Poster ini menambahkan ketiganya -- nama instansi, judul
 * survei, dan URL-nya dalam bentuk teks di bawah QR.
 *
 * PEMECAH BARISNYA DIPISAH sebagai fungsi murni dengan pengukur yang
 * disuntikkan. jsdom tak punya canvas, jadi `gambarPosterQr` tak dapat
 * dijalankan di Jest sama sekali; tanpa pemisahan ini, bagian yang paling
 * mungkin salah -- judul panjang yang meluber keluar poster -- hanya akan
 * ketahuan di peramban. Polanya mengikuti utils/unduh.js, yang memisahkan
 * penyusunan CSV dari pengunduhannya karena alasan yang sama.
 */

const ELIPSIS = '…';

/**
 * Pecah `teks` menjadi paling banyak `maksBaris` baris yang masing-masing tak
 * melebihi `maksLebar` menurut `ukur`.
 *
 * @param {string|null|undefined} teks
 * @param {number} maksLebar dalam satuan yang sama dengan keluaran `ukur`
 * @param {(teks: string) => number} ukur mis. `(t) => ctx.measureText(t).width`
 * @param {number} maksBaris
 * @returns {string[]} baris siap gambar; kosong bila tak ada teks
 */
export function pecahBaris(teks, maksLebar, ukur, maksBaris) {
  const kata = String(teks ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (kata.length === 0) return [];

  const baris = [];
  let sekarang = '';

  for (const k of kata) {
    const calon = sekarang ? `${sekarang} ${k}` : k;
    if (ukur(calon) <= maksLebar) {
      sekarang = calon;
      continue;
    }

    if (sekarang) baris.push(sekarang);

    // Batas baris tercapai: sisa kata tak lagi punya tempat, jadi baris
    // terakhir yang SUDAH ada ditandai terpotong.
    if (baris.length >= maksBaris) {
      baris[maksBaris - 1] = tandaiTerpotong(baris[maksBaris - 1], maksLebar, ukur);
      return baris.slice(0, maksBaris);
    }

    // Satu kata yang sendirian pun tak muat: dipotong, bukan dibiarkan meluber.
    sekarang = ukur(k) <= maksLebar ? k : tandaiTerpotong(k, maksLebar, ukur);
  }

  if (sekarang) baris.push(sekarang);

  if (baris.length > maksBaris) {
    const dipangkas = baris.slice(0, maksBaris);
    dipangkas[maksBaris - 1] = tandaiTerpotong(dipangkas[maksBaris - 1], maksLebar, ukur);
    return dipangkas;
  }

  return baris;
}

/**
 * Tandai bahwa teksnya terpotong, lalu buang karakter dari ekor sampai teks
 * BESERTA elipsisnya muat.
 *
 * SELALU menambahkan elipsis, juga ketika barisnya sudah muat. Elipsis di sini
 * menandai "masih ada lanjutannya", bukan "barisnya meluber" -- dan kedua hal
 * itu tidak sama. Baris yang kebetulan pas selebar poster tetap kehilangan
 * kata-kata sesudahnya, dan tanpa tanda, judul yang terpenggal terbaca seolah
 * memang sependek itu.
 *
 * Elipsisnya ikut diukur, bukan ditempel begitu saja: menambahkannya pada
 * baris yang sudah mepet justru membuatnya meluber -- kegagalan yang tepat
 * terjadi pada kasus yang seharusnya ditolong.
 */
function tandaiTerpotong(teks, maksLebar, ukur) {
  let potong = teks;
  while (potong.length > 0 && ukur(potong + ELIPSIS) > maksLebar) {
    potong = potong.slice(0, -1);
  }
  return potong.trimEnd() + ELIPSIS;
}

/**
 * Ukuran poster dalam piksel. 1080x1440 (rasio 3:4) supaya masih tajam dicetak
 * seukuran A5 tanpa memaksa siapa pun mengatur DPI.
 */
const LEBAR = 1080;
const TINGGI = 1440;
const TEPI = 84;

const PITA_TINGGI = 220;
/**
 * Lambang & nama instansi dibesarkan 22 September 2026 (permintaan pengguna).
 * 120 -> 152px. Pita tetap 220px supaya wilayah di bawahnya tak ikut bergeser
 * dan jaminan "tak ada wilayah bertumpang tindih" tetap berlaku apa adanya.
 */
const LAMBANG_UKURAN = 152;
const INSTANSI_UKURAN = 40;
const INSTANSI_LEADING = 50;
const KAKI_TINGGI = 8;

/**
 * Ukuran judul dan jarak barisnya. 84/62 = 1,35 -- dinaikkan dari 76 (1,23)
 * pada 22 September 2026 mengikuti panduan line-height: judul tiga baris yang
 * rapat terbaca padat di atas kertas.
 */
const JUDUL_UKURAN = 62;
const JUDUL_LEADING = 84;
const JUDUL_BARIS_MAKS = 3;

/**
 * QR 520px, turun dari 680. Harga yang dibayar sadar: pada cetak A5 itu masih
 * sekitar 71mm, jauh di atas ambang pindai ponsel, sementara judul yang
 * tertimpa merugikan jauh lebih besar.
 */
const QR_UKURAN = 520;

/**
 * Sejauh apa siku pemindai berdiri dari tepi GAMBAR QR, dan sepanjang apa
 * lengannya.
 *
 * Kecil (14px) dengan sengaja. Gambar QR-nya sendiri sudah membawa zona sunyi
 * 4 modul di dalam tepinya, sekitar 60px pada ukuran cetak ini; menambahkan
 * jarak besar lagi di luar sana membuat sikunya terbaca melayang lepas dari
 * kodenya alih-alih membingkainya. Diukur dengan melihat posternya, bukan
 * dikira-kira.
 */
const SIKU_JARAK = 14;
const SIKU_LENGAN = 56;

/** Selaras dengan token di app/globals.css (`--color-primary` dkk). */
const WARNA = {
  latar: '#FFFFFF',
  primer: '#004AC6',
  atasPrimer: '#FFFFFF',
  judul: '#0F172A',
  label: '#64748B',
  url: '#334155',
  chipIsi: '#F1F5F9',
  chipGaris: '#CBD5E1',
};

const AJAKAN = 'Pindai untuk mengisi survei';
const LABEL_URL = 'atau buka:';

export const LAMBANG_SRC = '/images/footer/Kabupaten-Madiun-Logo-transparent.png';

/**
 * Bagi poster menjadi wilayah-wilayah tetap, dan hitung garis alas judulnya.
 *
 * VERSI SEBELUMNYA BERTABRAKAN, dan bukan karena angkanya meleset. Judul tumbuh
 * ke bawah dari titik tetap sementara QR dipaku dari bawah -- dua jangkar yang
 * tak saling tahu, sehingga tabrakan bukan kemungkinan melainkan kepastian
 * begitu judulnya cukup panjang. Terukur: siku QR mulai pada y=484, baris
 * ketiga judul beralas di y=502, dan ajakannya di y=596 yang lalu tertutup
 * seluruhnya karena QR digambar belakangan.
 *
 * Di sini tiap bagian mendapat rentang y-nya sendiri yang TIDAK bergantung
 * pada panjang judul; yang berubah hanya letak baris di DALAM wilayah judul,
 * dipusatkan tegak. Dengan begitu tabrakan tak lagi mungkin, dan poster berseri
 * tetap sama letaknya -- dua hal yang dulu saya kira harus dipertukarkan.
 *
 * Dipisah sebagai fungsi murni supaya invariannya dapat dibuktikan tanpa
 * canvas: lihat uji "tak satu pun wilayah bertumpang tindih".
 *
 * @param {number} jumlahBarisJudul 0..3
 */
export function susunTataLetak(jumlahBarisJudul) {
  const n = Math.max(0, Math.min(JUDUL_BARIS_MAKS, jumlahBarisJudul));

  const wilayah = {
    pita: { atas: 0, bawah: PITA_TINGGI },
    judul: { atas: PITA_TINGGI, bawah: 540 },
    ajakan: { atas: 540, bawah: 620 },
    // Siku berdiri di luar gambar QR, jadi wilayahnya yang dipakai memeriksa
    // tabrakan -- bukan kotak QR-nya, yang lebih sempit.
    qr: { atas: 634, bawah: 634 + QR_UKURAN + SIKU_JARAK * 2 },
    tautan: { atas: 1220, bawah: 1348 },
    kaki: { atas: TINGGI - KAKI_TINGGI, bawah: TINGGI },
  };

  // Kotak TINTA, bukan garis alas: dari puncak huruf baris pertama sampai ekor
  // huruf baris terakhir. Memusatkan garis alas akan membuat judulnya duduk
  // terlalu rendah di dalam kotaknya.
  const tinggiBlok = n === 0 ? 0 : (n - 1) * JUDUL_LEADING + JUDUL_UKURAN;
  const ruang = wilayah.judul.bawah - wilayah.judul.atas;
  const mulai = wilayah.judul.atas + (ruang - tinggiBlok) / 2;

  const garisJudul = [];
  for (let i = 0; i < n; i += 1) {
    garisJudul.push(mulai + JUDUL_UKURAN + i * JUDUL_LEADING);
  }

  return {
    wilayah,
    garisJudul,
    blokJudul: { atas: mulai, bawah: mulai + tinggiBlok },
    tinggiKanvas: TINGGI,
    ukuranQr: QR_UKURAN,
  };
}

/**
 * Empat siku penanda di sekeliling kotak QR, sebagai daftar segmen garis.
 *
 * DIPISAH SEBAGAI FUNGSI MURNI supaya invarian terpentingnya dapat dibuktikan
 * tanpa peramban: tak satu pun siku boleh masuk ke dalam kotak QR. Di
 * sekeliling kode ada zona sunyi -- area putih bersih yang dipakai pemindai
 * untuk mengenali batas kodenya -- dan hiasan yang menyerobot ke sana membuat
 * QR lebih sulit dipindai, bukan lebih menarik. Bingkai versi sebelumnya
 * melakukan tepat itu: `strokeRect` digambar persis di tepi QR.
 *
 * @returns {Array<{x1: number, y1: number, x2: number, y2: number}>} 8 segmen
 */
export function sikuPemindai(x, y, ukuran, { jarak = SIKU_JARAK, lengan = SIKU_LENGAN } = {}) {
  const kiri = x - jarak;
  const kanan = x + ukuran + jarak;
  const atas = y - jarak;
  const bawah = y + ukuran + jarak;

  // Tiap sudut: satu lengan mendatar, satu menegak, keduanya berpangkal di
  // sudut yang sama sehingga `sudut.size === 4` pada ujinya bermakna.
  return [
    { x1: kiri, y1: atas, x2: kiri + lengan, y2: atas },
    { x1: kiri, y1: atas, x2: kiri, y2: atas + lengan },
    { x1: kanan, y1: atas, x2: kanan - lengan, y2: atas },
    { x1: kanan, y1: atas, x2: kanan, y2: atas + lengan },
    { x1: kiri, y1: bawah, x2: kiri + lengan, y2: bawah },
    { x1: kiri, y1: bawah, x2: kiri, y2: bawah - lengan },
    { x1: kanan, y1: bawah, x2: kanan - lengan, y2: bawah },
    { x1: kanan, y1: bawah, x2: kanan, y2: bawah - lengan },
  ];
}

/**
 * Muat lambang instansi; `null` bila gagal, dan itu bukan galat.
 *
 * Lambang adalah hiasan, dan hiasan tak boleh mematikan unduhan. Berkas yang
 * hilang atau jaringan yang tersendat hanya menghasilkan poster tanpa lambang
 * -- tetap tersusun, tetap turun. Keputusan pengguna, 22 September 2026.
 */
export function muatLambang(src) {
  if (!src) return Promise.resolve(null);

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** QR sudah berupa data URL, jadi tak ada CORS -- kegagalannya memang galat. */
function muatGambar(src) {
  return new Promise((resolve, tolak) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => tolak(new Error('QR gagal dimuat untuk poster'));
    img.src = src;
  });
}

/** Persegi panjang bersudut tumpul; `roundRect` belum ada di semua peramban. */
function kotakTumpul(ctx, x, y, lebar, tinggi, radius) {
  const r = Math.min(radius, lebar / 2, tinggi / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + lebar, y, x + lebar, y + tinggi, r);
  ctx.arcTo(x + lebar, y + tinggi, x, y + tinggi, r);
  ctx.arcTo(x, y + tinggi, x, y, r);
  ctx.arcTo(x, y, x + lebar, y, r);
  ctx.closePath();
}

/**
 * Susun poster PNG: pita resmi, judul, ajakan, QR bersiku, dan URL.
 *
 * Mengembalikan Blob, bukan data URL, supaya dapat diserahkan langsung ke
 * `simpanBlob` di utils/unduhBerkas.js -- penanganan unduhan yang sudah ada dan
 * sudah membereskan hal-hal yang mudah terlewat. Data URL poster ini berukuran
 * ratusan kilobyte; menaruhnya di atribut `href` berarti string sebesar itu
 * ikut hidup di DOM.
 *
 * @param {{qrDataUrl: string, judul: string, instansi?: string, url: string}} arg
 * @returns {Promise<Blob>} PNG siap disimpan
 */
export async function gambarPosterQr({ qrDataUrl, judul, instansi, url }) {
  const [qr, lambang] = await Promise.all([muatGambar(qrDataUrl), muatLambang(LAMBANG_SRC)]);

  const kanvas = document.createElement('canvas');
  kanvas.width = LEBAR;
  kanvas.height = TINGGI;
  const ctx = kanvas.getContext('2d');
  if (!ctx) throw new Error('Peramban ini tak menyediakan canvas 2D');

  const ukur = (t) => ctx.measureText(t).width;
  const tengah = LEBAR / 2;

  ctx.fillStyle = WARNA.latar;
  ctx.fillRect(0, 0, LEBAR, TINGGI);

  ctx.fillStyle = WARNA.primer;
  ctx.fillRect(0, 0, LEBAR, PITA_TINGGI);

  let teksKiri = TEPI;
  if (lambang) {
    const ly = (PITA_TINGGI - LAMBANG_UKURAN) / 2;
    ctx.drawImage(lambang, TEPI, ly, LAMBANG_UKURAN, LAMBANG_UKURAN);
    teksKiri = TEPI + LAMBANG_UKURAN + 32;
  }

  // Nama instansi kosong TIDAK diganti teks karangan seperti "Pemerintah
  // Kabupaten Madiun": itu mengarang afiliasi yang tak dikirim datanya. Pitanya
  // tetap tampil dengan lambang saja.
  if (instansi) {
    ctx.fillStyle = WARNA.atasPrimer;
    ctx.font = `600 ${INSTANSI_UKURAN}px system-ui, sans-serif`;
    ctx.textAlign = 'left';
    const barisInstansi = pecahBaris(instansi, LEBAR - teksKiri - TEPI, ukur, 2);
    let iy = (PITA_TINGGI - barisInstansi.length * INSTANSI_LEADING) / 2 + INSTANSI_UKURAN;
    for (const baris of barisInstansi) {
      ctx.fillText(baris, teksKiri, iy);
      iy += INSTANSI_LEADING;
    }
  }

  ctx.textAlign = 'center';
  const isiLebar = LEBAR - TEPI * 2;

  // Baris judul dipecah DULU, sebab jumlahnyalah yang menentukan letak tiap
  // barisnya di dalam wilayah judul. Wilayahnya sendiri tidak ikut bergeser --
  // itulah yang membuat tabrakan dengan QR tak lagi mungkin.
  ctx.font = `bold ${JUDUL_UKURAN}px system-ui, sans-serif`;
  const barisJudul = pecahBaris(judul, isiLebar, ukur, JUDUL_BARIS_MAKS);
  const tata = susunTataLetak(barisJudul.length);

  ctx.fillStyle = WARNA.judul;
  barisJudul.forEach((baris, i) => {
    ctx.fillText(baris, tengah, tata.garisJudul[i]);
  });

  // Poster tanpa kata kerja tidak dipindai siapa pun: sebelum ini tak ada satu
  // pun kalimat yang menyuruh orang melakukan sesuatu. Sempat hilang sama
  // sekali dari poster tercetak karena QR digambar menimpanya.
  ctx.fillStyle = WARNA.primer;
  ctx.font = '600 32px system-ui, sans-serif';
  ctx.fillText(AJAKAN, tengah, tata.wilayah.ajakan.bawah - 22);

  const qrX = tengah - QR_UKURAN / 2;
  const qrY = tata.wilayah.qr.atas + SIKU_JARAK;
  ctx.drawImage(qr, qrX, qrY, QR_UKURAN, QR_UKURAN);

  ctx.strokeStyle = WARNA.primer;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  for (const s of sikuPemindai(qrX, qrY, QR_UKURAN)) {
    ctx.beginPath();
    ctx.moveTo(s.x1, s.y1);
    ctx.lineTo(s.x2, s.y2);
    ctx.stroke();
  }

  // QR tak berguna bagi yang kameranya menolak memindai; alamat yang dapat
  // diketik ulang adalah jalan keluarnya.
  const labelY = tata.wilayah.tautan.atas + 28;
  ctx.fillStyle = WARNA.label;
  ctx.font = '500 28px system-ui, sans-serif';
  ctx.fillText(LABEL_URL, tengah, labelY);

  ctx.font = '500 30px ui-monospace, monospace';
  const teksUrl = pecahBaris(url, isiLebar - 64, ukur, 1)[0] ?? '';
  const chipLebar = ukur(teksUrl) + 56;
  const chipTinggi = 62;
  const chipY = labelY + 24;

  kotakTumpul(ctx, tengah - chipLebar / 2, chipY, chipLebar, chipTinggi, 16);
  ctx.fillStyle = WARNA.chipIsi;
  ctx.fill();
  ctx.strokeStyle = WARNA.chipGaris;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = WARNA.url;
  ctx.fillText(teksUrl, tengah, chipY + 41);

  ctx.fillStyle = WARNA.primer;
  ctx.fillRect(0, TINGGI - KAKI_TINGGI, LEBAR, KAKI_TINGGI);

  return new Promise((resolve, tolak) => {
    kanvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else tolak(new Error('Poster QR gagal disusun menjadi berkas PNG'));
    }, 'image/png');
  });
}

