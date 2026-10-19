/**
 * Pembentuk snippet untuk halaman Dokumentasi API.
 *
 * TANPA EKSEKUSI. Halaman ini tak pernah menembakkan permintaan; snippet di
 * sini hanya untuk disalin. Itu pilihan tersurat pemilik produk: percobaan
 * POST/PATCH/DELETE akan menulis data sungguhan dan satu baris `audit_logs`
 * yang menurut rancangan tak boleh dihapus.
 */

/** Nilai sesi sungguhan TIDAK PERNAH masuk snippet. Lihat uji keamanan di
 * `__tests__/snippet.test.js`. */
export const PENGISI_TOKEN = '<token>';

/**
 * Nilai contoh menurut urutan: `example` -> anggota `enum` pertama -> pengisi
 * bertipe yang TERLIHAT sebagai pengisi.
 *
 * Anggota `enum` bukan karangan: ia nilai yang didokumentasikan sendiri oleh
 * API. Pengisi dipilih agar tak ada yang menyalin snippet lalu mengira
 * nilainya sudah benar.
 */
export function nilaiContoh(properti) {
  if (properti.contoh !== null && properti.contoh !== undefined) return properti.contoh;
  if (properti.pilihan?.length) return properti.pilihan[0];

  const batasan = properti.batasan ?? {};

  // CACAT YANG DIPERBAIKI DI SINI: `0` dulu diberikan untuk SETIAP angka,
  // padahal dokumen mendeklarasikan `minimum: 1` pada lima properti (mis.
  // `AnswerInputDto.nilai`, skala 1-4). Snippet yang disalin apa adanya karena
  // itu pasti ditolak 400 -- ia menyarankan nilai yang API-nya sendiri
  // nyatakan tak sah.
  switch (properti.tipe) {
    case 'number':
    case 'integer':
      return batasan.minimum ?? 0;
    case 'boolean':
      return false;
    case 'array':
      return [];
    case 'object':
      return {};
    default:
      // 28 properti ber-`format: date-time`. Menuliskannya `<string>` membuat
      // contoh respons menyarankan bentuk yang salah.
      return batasan.format === 'date-time' ? '<ISO-8601>' : '<string>';
  }
}

/** Badan permintaan hanya memuat properti WAJIB. Memuat yang opsional membuat
 * snippet berisik dan menyarankan nilai yang tak diminta API. */
function badanContoh(operasi) {
  if (!operasi.skemaBadan) return null;
  const wajib = operasi.skemaBadan.wajib ?? [];
  if (wajib.length === 0) return null;

  const isi = {};
  for (const p of operasi.skemaBadan.properti) {
    if (wajib.includes(p.nama)) isi[p.nama] = nilaiContoh(p);
  }
  return isi;
}

/**
 * Contoh badan permintaan sebagai BLOK TERSENDIRI (6 Oktober 2026, permintaan
 * pengguna: "tambahkan request body di halaman dokumentasi api").
 *
 * Sebelum ini contohnya hanya terbenam di dalam snippet curl/fetch, sehingga
 * orang yang memakai klien lain harus menambangnya dari perintah shell.
 *
 * MEMAKAI `badanContoh` YANG SAMA dengan kedua snippet itu, bukan penyusun
 * kedua: dua penyusun berarti dua contoh yang cepat atau lambat menyimpang, dan
 * yang menyimpang tak akan terlihat siapa pun karena keduanya tampak masuk akal.
 *
 * `null` -- bukan string kosong -- bagi operasi tanpa badan, supaya komponennya
 * dapat MENYEMBUNYIKAN tabnya alih-alih menggambar blok kosong tanpa keterangan.
 */
export function badanPermintaan(operasi) {
  const badan = badanContoh(operasi);
  if (!badan) return null;
  // `multipart/form-data` tak pernah dikirim sebagai JSON; menggambarkannya
  // begitu akan menyesatkan orang yang menyalinnya.
  if (operasi.jenisBadan === 'multipart/form-data') {
    return Object.entries(badan)
      .map(([k, v]) => `${k}=${v}`)
      .join(String.fromCharCode(10));
  }
  return JSON.stringify(badan, null, 2);
}

/** `{id}` -> `<id>`. Pengisi, bukan angka contoh: angka contoh membuat orang
 * menyalin lalu menyentuh data milik orang lain tanpa sadar.
 *
 * Diekspor karena `lib/respons.js` memakai aturan yang SAMA untuk `meta.path`;
 * menyalinnya ke sana akan melahirkan dua kebenaran. */
export function pathTerisi(path) {
  return path.replace(/\{([^}]+)\}/g, '<$1>');
}

/** Query WAJIB saja. Yang opsional ditabelkan komponen, supaya snippet tak
 * memuat nilai karangan seperti `page=1`. */
function queryWajib(operasi) {
  const wajib = operasi.parameterQuery.filter((p) => p.wajib);
  if (wajib.length === 0) return '';
  const bagian = wajib.map((p) => `${p.nama}=${nilaiContoh(p)}`);
  return `?${bagian.join('&')}`;
}

export function curlSnippet(operasi, { asal = '' } = {}) {
  const url = `${asal}${pathTerisi(operasi.path)}${queryWajib(operasi)}`;
  const baris = [`curl -X ${operasi.metode} '${url}'`, `  -b 'session=${PENGISI_TOKEN}'`];

  const badan = badanContoh(operasi);
  if (badan) {
    // multipart TIDAK dikirim sebagai `-d`: curl menyusun batas multipart
    // sendiri lewat `-F`, dan memakai `-d` menghasilkan Content-Type yang salah
    // sehingga permintaannya ditolak server.
    if (operasi.jenisBadan === 'multipart/form-data') {
      for (const [k, v] of Object.entries(badan)) baris.push(`  -F '${k}=${v}'`);
    } else {
      baris.push(`  -H 'Content-Type: application/json'`);
      baris.push(`  -d '${JSON.stringify(badan, null, 2)}'`);
    }
  }

  return baris.join(' \\\n');
}

/**
 * Dijalankan dari peramban pada origin yang SAMA, jadi `credentials: 'include'`
 * membuat peramban mengirim cookie `session` miliknya sendiri -- snippet ini
 * karena itu tak memuat kredensial apa pun, bahkan pengisi.
 */
export function fetchSnippet(operasi) {
  const url = `${pathTerisi(operasi.path)}${queryWajib(operasi)}`;
  const badan = badanContoh(operasi);

  const opsi = [`  method: '${operasi.metode}'`, `  credentials: 'include'`];
  const awalan = [];
  if (badan) {
    if (operasi.jenisBadan === 'multipart/form-data') {
      // Content-Type SENGAJA tak disetel: peramban harus menyusunnya sendiri
      // agar `boundary`-nya ikut terkirim.
      awalan.push('const form = new FormData();');
      for (const [k, v] of Object.entries(badan)) awalan.push(`form.append('${k}', '${v}');`);
      awalan.push('');
      opsi.push(`  body: form`);
    } else {
      opsi.push(`  headers: { 'Content-Type': 'application/json' }`);
      opsi.push(`  body: JSON.stringify(${JSON.stringify(badan, null, 2)})`);
    }
  }

  return [
    ...awalan,
    `const res = await fetch('${url}', {`,
    opsi.join(',\n') + ',',
    `});`,
    `const json = await res.json();`,
  ].join('\n');
}
