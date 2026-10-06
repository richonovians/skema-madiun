import React, { useState } from 'react';
import { Check, Link2 } from 'lucide-react';
import TabSnippet from './TabSnippet';
import { salinTeks } from '../lib/salin';

const WARNA_METODE = {
  GET: 'bg-blue-500/10 text-blue-700',
  POST: 'bg-green-600/10 text-green-700',
  PATCH: 'bg-amber-500/10 text-amber-700',
  DELETE: 'bg-red-600/10 text-red-700',
};

/**
 * Batasan ditulis sebagai kalimat, bukan nama kunci JSON: pembaca halaman ini
 * administrator, bukan orang yang sedang membaca spesifikasi OpenAPI.
 */
function kalimatBatasan(batasan = {}) {
  const bagian = [];
  const { minLength, maxLength, minimum, maximum, format } = batasan;

  // `minLength: 1` hanya berarti "tak boleh kosong", yang sudah tersirat dari
  // statusnya sebagai kolom wajib. Menuliskannya sebagai rentang "1-100"
  // menambah angka tanpa menambah keterangan.
  const panjangMin = minLength === 1 ? undefined : minLength;

  if (panjangMin !== undefined && maxLength !== undefined) {
    bagian.push(`${panjangMin}–${maxLength} karakter`);
  } else if (maxLength !== undefined) {
    bagian.push(`maks ${maxLength} karakter`);
  } else if (panjangMin !== undefined) {
    bagian.push(`min ${panjangMin} karakter`);
  }

  if (minimum !== undefined && maximum !== undefined) bagian.push(`${minimum}–${maximum}`);
  else if (minimum !== undefined) bagian.push(`minimal ${minimum}`);
  else if (maximum !== undefined) bagian.push(`maksimal ${maximum}`);

  if (format) bagian.push(format === 'date-time' ? 'waktu ISO-8601' : format);

  return bagian.join(', ');
}

/**
 * Siapa yang boleh memanggil. Diturunkan dari `x-peran`/`x-publik` yang
 * diterbitkan backend dari metadata yang DITEGAKKAN `RolesGuard`.
 *
 * Tiga keadaan yang berbeda artinya, dan tak boleh dilebur:
 *   - publik              -> tanpa sesi sama sekali
 *   - daftar peran berisi -> hanya peran itu
 *   - daftar peran KOSONG -> butuh sesi, peran apa pun; isolasinya ditegakkan
 *                            di service, bukan di guard
 */
function labelPeran(operasi) {
  if (operasi.publik) return 'Publik — tanpa sesi';
  if (operasi.peran === null) return null;
  if (operasi.peran.length === 0) return 'Semua peran terautentikasi';
  return `Peran: ${operasi.peran.join(', ')}`;
}

/** Satu baris properti: nama, tipe, batasan, pilihan, lalu keterangannya. */
function BarisProperti({ properti }) {
  const batasan = kalimatBatasan(properti.batasan);

  return (
    <li className="text-body-md leading-relaxed text-on-surface-variant">
      <code className="text-on-surface">{properti.nama}</code> — {properti.tipe ?? 'tak bertipe'}
      {batasan ? <span>, {batasan}</span> : null}
      {properti.pilihan ? <span>. Pilihan: {properti.pilihan.join(', ')}</span> : null}
      {properti.keterangan ? (
        <span className="block text-on-surface-variant">{properti.keterangan}</span>
      ) : null}
    </li>
  );
}

function Daftar({ judul, properti }) {
  if (properti.length === 0) return null;
  return (
    <div className="mt-sm">
      <p className="text-body-md font-semibold text-on-surface">{judul}</p>
      <ul className="mt-2 space-y-2">
        {properti.map((p) => (
          <BarisProperti key={p.nama} properti={p} />
        ))}
      </ul>
    </div>
  );
}

/**
 * Satu endpoint: metode, path, ringkasan, kolom & parameter, lalu snippet.
 *
 * KOLOM WAJIB IKUT DITABELKAN. Sebelumnya hanya yang opsional, sehingga kolom
 * wajib cuma muncul sebagai nilai di dalam snippet dan keterangan maupun
 * batasannya tak punya tempat mendarat -- padahal justru kolom wajib yang
 * paling perlu dijelaskan sebelum orang mengirim permintaan.
 *
 * TOKEN PROSA, BUKAN TOKEN LABEL. Versi pertama berkas ini menulis kalimat
 * dengan `text-label-sm`; token label di `globals.css` ber-line-height 1.2,
 * ukuran untuk label satu baris, bukan untuk kalimat yang membungkus. Warnanya
 * tidak diubah: diukur 5 Oktober 2026, `on-surface-variant` di atas
 * `surface-variant` berasio 7.26:1 dan `on-surface` 13.34:1, keduanya lolos AA.
 */
export default function DetailOperasi({ operasi }) {
  const queryOpsional = operasi.parameterQuery.filter((p) => !p.wajib);
  const queryWajib = operasi.parameterQuery.filter((p) => p.wajib);
  const wajibBadan = operasi.skemaBadan?.wajib ?? [];
  const semuaBadan = operasi.skemaBadan?.properti ?? [];
  const badanWajib = semuaBadan.filter((p) => wajibBadan.includes(p.nama));
  const badanOpsional = semuaBadan.filter((p) => !wajibBadan.includes(p.nama));

  // Hash dikodekan karena id memuat `/` dan `{}`; `DokumentasiApiScreen`
  // membacanya kembali dengan `decodeURIComponent`.
  const [tautanTersalin, setTautanTersalin] = useState(false);
  const salinTautan = async () => {
    const asal = typeof window === 'undefined' ? '' : window.location.href.split('#')[0];
    const berhasil = await salinTeks(`${asal}#${encodeURIComponent(operasi.id)}`);
    setTautanTersalin(berhasil);
    setTimeout(() => setTautanTersalin(false), 3000);
  };

  return (
    <li id={operasi.id} className="scroll-mt-24 border-t border-border py-md first:border-t-0">
      <div className="flex flex-wrap items-center gap-sm">
        <span
          className={`w-20 shrink-0 rounded px-2 py-1 text-center text-label-sm font-semibold ${
            WARNA_METODE[operasi.metode] ?? 'bg-surface-variant text-on-surface-variant'
          }`}
        >
          {operasi.metode}
        </span>
        <code className="break-all text-body-md text-on-surface">{operasi.path}</code>
        {labelPeran(operasi) ? (
          <span
            className={`rounded-full px-3 py-1 text-label-sm ${
              operasi.publik
                ? 'bg-amber-500/10 text-amber-700'
                : 'bg-surface-variant text-on-surface-variant'
            }`}
          >
            {labelPeran(operasi)}
          </span>
        ) : null}
        <button
          type="button"
          onClick={salinTautan}
          aria-label={`Salin tautan ke ${operasi.metode} ${operasi.path}`}
          className="ml-auto flex min-h-[44px] items-center gap-2 rounded-lg px-sm text-label-sm text-on-surface-variant transition-colors hover:bg-surface-variant"
        >
          {tautanTersalin ? <Check size={14} /> : <Link2 size={14} />}
          {tautanTersalin ? 'Tersalin' : 'Tautan'}
        </button>
      </div>

      {operasi.ringkasan && (
        <p className="mt-2 max-w-prose text-body-md leading-relaxed text-on-surface-variant">
          {operasi.ringkasan}
        </p>
      )}

      {/* Dinyatakan tersurat: tanpa ini endpoint multipart terbaca seperti
          endpoint JSON biasa, dan snippet `-F`-nya tampak sewenang-wenang. */}
      {operasi.jenisBadan === 'multipart/form-data' && (
        <p className="mt-sm text-body-md leading-relaxed text-on-surface-variant">
          Badan permintaan dikirim sebagai <code>multipart/form-data</code>, bukan JSON. Lampiran
          berkas memakai medan terpisah di luar daftar ini.
        </p>
      )}

      <Daftar judul="Parameter path" properti={operasi.parameterPath} />
      <Daftar judul="Query wajib" properti={queryWajib} />
      <Daftar judul="Kolom wajib di badan permintaan" properti={badanWajib} />
      <Daftar judul="Query opsional — boleh kamu tambahkan sendiri" properti={queryOpsional} />
      <Daftar judul="Kolom opsional di badan permintaan" properti={badanOpsional} />

      <TabSnippet operasi={operasi} />
    </li>
  );
}
