import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * PAGAR ATAS NASKAH SUMMARY, dibaca dari BERKAS SUMBER.
 *
 * `nest-cli.json` menyalakan `introspectComments: true`, sehingga plugin
 * `@nestjs/swagger` menarik SELURUH blok JSDoc sebuah handler ke dalam
 * `summary` -- bukan baris pertamanya saja. Diukur pada dokumen hidup 5 Oktober
 * 2026: 20 dari 60 summary membawa blok utuh, yang terpanjang 944 karakter,
 * lengkap dengan tanggal keputusan, nomor temuan audit, nama berkas e2e, dan
 * riwayat bypass yang dibongkar. Itu naskah untuk pemelihara kode, bukan untuk
 * pembaca dokumentasi API.
 *
 * KENAPA DIBACA DARI SUMBER, bukan dari dokumen yang dibangun. Plugin itu
 * berjalan saat KOMPILASI lewat Nest CLI, dan ts-jest tidak menjalankannya.
 * Dokumen yang dibangun di dalam uji karena itu hanya memuat 5 summary dari 65
 * operasi -- uji yang memeriksanya akan hijau tanpa membuktikan apa pun. Saya
 * menulis uji semacam itu lebih dulu dan ia memang lulus seketika; itulah sebab
 * berkas ini membaca `.controller.ts` langsung, menirukan apa yang dilakukan
 * plugin atas berkas yang sama.
 *
 * Obatnya `@ApiOperation({ summary })` tersurat pada handler yang JSDoc-nya
 * panjang. JSDoc-nya TIDAK dibuang: dua audiens, dua naskah, masing-masing di
 * tempatnya.
 */
const AKAR = join(__dirname, '..', '..');
const BATAS = 120;
const DEKORATOR_HTTP = /@(Get|Post|Patch|Put|Delete)\s*\(/;

function berkasController(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((n) => n.endsWith('.controller.ts'))
    .map((n) => join(dir, n));
}

/** Isi JSDoc tanpa penanda komentar, dipecah menjadi paragraf. */
function paragrafJsdoc(blok: string): string[] {
  const baris = blok.split(String.fromCharCode(10)).map((b) =>
    b
      .replace(/^\s*\/?\*{1,2}\/?/, '')
      .replace(/\*\/\s*$/, '')
      .trim(),
  );
  const par: string[] = [];
  let kini: string[] = [];
  for (const b of baris) {
    if (b === '') {
      if (kini.length) par.push(kini.join(' '));
      kini = [];
    } else {
      kini.push(b);
    }
  }
  if (kini.length) par.push(kini.join(' '));
  return par.filter((p) => p !== '');
}

/**
 * Tumpukan dekorator yang menempel TEPAT sesudah sebuah JSDoc.
 *
 * Berhenti pada baris pertama yang bukan dekorator dan bukan sambungan
 * dekorator yang kurungnya belum tertutup. Tanpa penghitungan kurung itu,
 * dekorator bertingkat seperti `@ApiResponse({ ... })` yang ditulis beberapa
 * baris akan memutus pembacaan di tengah jalan.
 */
function tumpukanDekorator(baris: string[], mulai: number): string {
  const kumpul: string[] = [];
  let kurung = 0;
  for (let i = mulai; i < baris.length; i++) {
    const b = baris[i].trim();
    if (b === '') {
      if (kurung === 0) break;
      continue;
    }
    if (kurung === 0 && !b.startsWith('@')) break;
    kumpul.push(b);
    kurung += (b.match(/\(/g) ?? []).length - (b.match(/\)/g) ?? []).length;
  }
  return kumpul.join(String.fromCharCode(10));
}

function pelanggaran(): string[] {
  const hasil: string[] = [];

  for (const berkas of berkasController(AKAR)) {
    const isi = readFileSync(berkas, 'utf8');
    const baris = isi.split(String.fromCharCode(10));
    // String.fromCharCode(92) dipakai alih-alih escape garis miring: alat
    // penyunting berkas di lingkungan ini pernah menelan salah satunya.
    const nama = berkas
      .slice(AKAR.length + 1)
      .split(String.fromCharCode(92))
      .join('/');

    for (let i = 0; i < baris.length; i++) {
      if (baris[i].trim() !== '/**') continue;

      let akhir = i;
      while (akhir < baris.length && !baris[akhir].includes('*/')) akhir++;
      if (akhir >= baris.length) continue;

      const dekorator = tumpukanDekorator(baris, akhir + 1);
      if (!DEKORATOR_HTTP.test(dekorator)) continue;
      if (dekorator.includes('@ApiOperation')) continue;
      // `@ApiExcludeEndpoint()` membuat handlernya TAK PERNAH terbit ke
      // dokumen, jadi JSDoc-nya tak pernah sampai ke pembaca mana pun.
      // Tanpa pengecualian ini pagar menuntut naskah untuk dua rute SSO yang
      // memang sengaja disembunyikan -- diperiksa 5 Oktober 2026.
      if (dekorator.includes('@ApiExcludeEndpoint')) continue;

      const par = paragrafJsdoc(baris.slice(i, akhir + 1).join(String.fromCharCode(10)));
      if (par.length === 0) continue;

      const rute = dekorator.match(DEKORATOR_HTTP)?.[1] ?? '?';
      if (par.length > 1) {
        hasil.push(`${nama}:${i + 1} @${rute} -- JSDoc ${par.length} paragraf`);
      } else if (par[0].length > BATAS) {
        hasil.push(`${nama}:${i + 1} @${rute} -- JSDoc ${par[0].length} karakter`);
      }
    }
  }

  return hasil.sort();
}

/**
 * Handler ber-dekorator HTTP yang TAK punya naskah sama sekali: tanpa JSDoc dan
 * tanpa `@ApiOperation`. Lima di antaranya terukur di dokumen hidup 6 Oktober
 * 2026, dan kelimanya tampil di halaman Dokumentasi API tanpa satu kalimat pun
 * penjelas -- pembaca hanya melihat metode dan path.
 */
function tanpaNaskah(): string[] {
  const hasil: string[] = [];

  for (const berkas of berkasController(AKAR)) {
    const isi = readFileSync(berkas, 'utf8');
    const baris = isi.split(String.fromCharCode(10));
    const nama = berkas
      .slice(AKAR.length + 1)
      .split(String.fromCharCode(92))
      .join('/');

    for (let i = 0; i < baris.length; i++) {
      const b = baris[i].trim();
      // Baris KOMENTAR dilewati: beberapa docblock mengutip `@Get(':id')` di
      // dalam penjelasannya, dan tanpa saringan ini kutipan itu terhitung
      // sebagai handler yang tak bernaskah.
      if (b.startsWith('*') || b.startsWith('//') || b.startsWith('/*')) continue;
      if (!DEKORATOR_HTTP.test(b)) continue;

      const dekorator = tumpukanDekorator(baris, i);
      if (dekorator.includes('@ApiExcludeEndpoint')) continue;
      if (dekorator.includes('@ApiOperation')) continue;

      // JSDoc yang menempel berakhir tepat di baris sebelum tumpukan dekorator.
      let atas = i - 1;
      while (atas >= 0 && baris[atas].trim().startsWith('@')) atas--;
      const adaJsdoc = atas >= 0 && baris[atas].trim().endsWith('*/');
      if (!adaJsdoc) hasil.push(`${nama}:${i + 1} ${b}`);
    }
  }

  return hasil.sort();
}

describe('Naskah summary handler', () => {
  it('menemukan berkas controller untuk diperiksa', () => {
    // Tanpa ini, jalur yang salah menghasilkan nol berkas, nol pelanggaran, dan
    // uji di bawah lulus tanpa memeriksa apa pun.
    expect(berkasController(AKAR).length).toBeGreaterThan(10);
  });

  it('handler ber-JSDoc panjang wajib punya @ApiOperation tersurat', () => {
    expect(pelanggaran()).toEqual([]);
  });

  it('setiap handler punya naskah: JSDoc atau @ApiOperation', () => {
    expect(tanpaNaskah()).toEqual([]);
  });
});
