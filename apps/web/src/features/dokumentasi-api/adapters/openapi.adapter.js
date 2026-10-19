/**
 * Dokumen OpenAPI -> daftar grup per tag, bentuk yang dipakai komponen.
 *
 * SATU-SATUNYA tempat bentuk dokumen OpenAPI diterjemahkan. Bila kontrak
 * dokumennya berubah, hanya berkas ini yang disunting.
 *
 * TIDAK MENGARANG NILAI: operasi tanpa `summary` menghasilkan `null`, bukan
 * teks karangan. Pada dokumen sungguhan (terukur 5 Oktober 2026) 5 dari 64
 * operasi memang tak punya ringkasan, dan 64 dari 64 tak punya deskripsi.
 */

/** Jaring pengaman. Hari ini NOL operasi tanpa tag, tetapi operasi yang suatu
 * saat lahir tanpa `@ApiTags` lebih baik muncul di grup ini daripada hilang
 * dari halaman tanpa jejak. */
const GRUP_TANPA_TAG = 'Lain-lain';

/**
 * Batasan yang BENAR-BENAR ADA di dokumen ini: `maxLength` (21), `minLength`
 * (12), `format` (28), `minimum` (5), `maximum` (1) -- terukur 6 Oktober 2026.
 * `pattern` NOL kemunculan, jadi aturan seperti format `periode` hanya hidup
 * sebagai `description` properti, bukan sebagai regex.
 */
const KUNCI_BATASAN = ['minLength', 'maxLength', 'minimum', 'maximum', 'format'];

function batasanDari(skema) {
  const hasil = {};
  for (const k of KUNCI_BATASAN) {
    if (skema?.[k] !== undefined) hasil[k] = skema[k];
  }
  return hasil;
}

/** Satu properti skema -> bentuk yang dipakai komponen & pembentuk snippet. */
function properti(nama, p) {
  return {
    nama,
    tipe: p.type ?? null,
    contoh: p.example ?? null,
    pilihan: p.enum ?? null,
    keterangan: p.description ?? null,
    batasan: batasanDari(p),
  };
}

function skemaDari(dokumen, ref) {
  // `$ref` berbentuk '#/components/schemas/<Nama>'.
  const nama = String(ref).split('/').pop();
  return dokumen?.components?.schemas?.[nama] ?? null;
}

/**
 * Badan permintaan, dari jenis konten APA PUN yang dideklarasikan.
 *
 * Sebelumnya berkas ini hanya membaca `application/json`. Dua endpoint tulis
 * terpenting produk ini -- `POST /complaints` dan `POST /complaints/{id}/replies`
 * -- memakai `multipart/form-data`, dan keduanya `$ref` ke DTO yang sama
 * lengkapnya dengan badan JSON mana pun. Akibatnya halaman melaporkan
 * pengajuan pengaduan seolah tak butuh mengirim apa pun.
 */
function badanDari(dokumen, operasi) {
  const konten = operasi?.requestBody?.content;
  if (!konten) return { jenisBadan: null, skemaBadan: null };

  const jenis = Object.keys(konten)[0];
  const skema = konten[jenis]?.schema;
  if (!skema) return { jenisBadan: jenis ?? null, skemaBadan: null };

  // Dokumen sungguhan memakai `$ref`; bentuk inline tetap didukung supaya
  // perubahan di sisi backend tak mematahkan halaman tanpa suara.
  const penuh = skema.$ref ? skemaDari(dokumen, skema.$ref) : skema;
  if (!penuh?.properties) return { jenisBadan: jenis, skemaBadan: null };

  return {
    jenisBadan: jenis,
    skemaBadan: {
      wajib: penuh.required ?? [],
      properti: Object.entries(penuh.properties).map(([nama, p]) => properti(nama, p)),
    },
  };
}

function parameterDari(operasi, tempat) {
  return (operasi.parameters ?? [])
    .filter((p) => p.in === tempat)
    .map((p) => ({
      nama: p.name,
      tipe: p.schema?.type ?? null,
      wajib: Boolean(p.required),
      pilihan: p.schema?.enum ?? null,
      contoh: p.schema?.example ?? null,
      // Keterangan parameter ada di parameternya, batasannya di `schema` miliknya.
      keterangan: p.description ?? null,
      batasan: batasanDari(p.schema),
    }));
}

/**
 * Status sukses dan bentuk `data` dari blok `responses` milik operasi.
 *
 * Status DIBACA, tidak ditebak: 61 operasi mendeklarasikan 200 dan 4
 * mendeklarasikan 201 (terukur 5 Oktober 2026). Skemanya dapat berbentuk array
 * (`items.$ref`) maupun objek (`$ref` langsung), dan pada 11 operasi memang
 * tidak ada sama sekali -- yang terakhir menghasilkan `null`, bukan bentuk
 * karangan.
 *
 * Seluruh properti dibawa, bukan yang wajib saja. Badan permintaan memang
 * dipangkas ke yang wajib supaya snippet tak menyarankan nilai yang tak
 * diminta, tetapi respons tidak diketik siapa pun: di sana kelengkapan bentuk
 * justru yang dicari pembacanya.
 */
function responsDari(dokumen, operasi) {
  const kode = Object.keys(operasi.responses ?? {}).find((k) => k.startsWith('2'));
  if (!kode) return { statusSukses: null, skemaRespons: null };

  const statusSukses = Number(kode);
  const skema = operasi.responses[kode]?.content?.['application/json']?.schema;
  if (!skema) return { statusSukses, skemaRespons: null };

  const daftar = skema.type === 'array';
  const inti = daftar ? skema.items : skema;
  const penuh = inti?.$ref ? skemaDari(dokumen, inti.$ref) : inti;
  if (!penuh?.properties) return { statusSukses, skemaRespons: null };

  return {
    statusSukses,
    skemaRespons: {
      daftar,
      // Dibawa supaya halaman dapat membedakan medan yang PASTI ada dari yang
      // boleh `null`: 55 dari 61 skema mendeklarasikannya.
      wajib: penuh.required ?? [],
      properti: Object.entries(penuh.properties).map(([nama, p]) => properti(nama, p)),
    },
  };
}

export function adaptOpenApi(dokumen) {
  const paths = dokumen?.paths;
  if (!paths) return [];

  // Diterbitkan `anotasiRute` di backend dari konfigurasi throttler yang
  // sesungguhnya. Dibawa ke tiap operasi supaya komponen tak perlu menerima
  // dokumen utuh hanya untuk satu angka.
  const batasLajuGlobal = dokumen['x-batas-laju-global'] ?? null;

  const perTag = new Map();

  for (const [path, metodeMap] of Object.entries(paths)) {
    for (const [metode, operasi] of Object.entries(metodeMap)) {
      const tag = operasi.tags?.[0] ?? GRUP_TANPA_TAG;
      const { statusSukses, skemaRespons } = responsDari(dokumen, operasi);
      const { jenisBadan, skemaBadan } = badanDari(dokumen, operasi);
      const rapi = {
        id: `${metode.toLowerCase()}-${path}`,
        metode: metode.toUpperCase(),
        path,
        tag,
        ringkasan: operasi.summary ?? null,
        deskripsi: operasi.description ?? null,
        parameterPath: parameterDari(operasi, 'path'),
        parameterQuery: parameterDari(operasi, 'query'),
        skemaBadan,
        jenisBadan,
        statusSukses,
        skemaRespons,
        // `security` per operasi ADA di dokumen sungguhan: 61 dari 65
        // membawanya, dan 4 yang tidak memang endpoint publik. Jadi ini
        // kebenaran dokumen, bukan tebakan dari nama jalurnya.
        butuhSesi: Array.isArray(operasi.security) && operasi.security.length > 0,
        // `x-peran`, `x-publik`, `x-batas-laju`: ekstensi yang diterbitkan
        // backend dari metadata yang DITEGAKKAN guard, bukan naskah tangan.
        // Daftar peran kosong berarti "seluruh peran terautentikasi", bukan
        // data yang hilang.
        peran: operasi['x-peran'] ?? null,
        publik: operasi['x-publik'] === true,
        batasLaju: operasi['x-batas-laju'] ?? null,
        batasLajuGlobal,
      };
      if (!perTag.has(tag)) perTag.set(tag, []);
      perTag.get(tag).push(rapi);
    }
  }

  return [...perTag.entries()].map(([tag, operasi]) => ({ tag, operasi }));
}
