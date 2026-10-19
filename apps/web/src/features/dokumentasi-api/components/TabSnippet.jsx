'use client';

import React, { useState } from 'react';
import { AlertTriangle, Check, Copy } from 'lucide-react';
import { badanPermintaan, curlSnippet, fetchSnippet } from '../lib/snippet';
import { responsBerhasil, responsGagal, kodeGalatLain, mungkinBerpaginasi } from '../lib/respons';
import { salinTeks } from '../lib/salin';

/**
 * ISTILAHNYA INGGRIS DI LAYAR (7 Oktober 2026, permintaan pengguna: "ubah teks
 * badan/permintaan badan menjadi body/request body"). Pengecualian tersurat
 * dari aturan repo bahwa teks antarmuka berbahasa Indonesia: pembaca halaman
 * ini sedang mencocokkan dokumen OpenAPI, yang medannya memang bernama
 * `requestBody`. Nama identifier di kode tetap Indonesia (`teksBadan`,
 * `badanPermintaan`); yang berubah hanya yang terbaca pengguna.
 *
 * `body` DISISIPKAN SECARA BERSYARAT (6 Oktober 2026, permintaan pengguna:
 * "tambahkan request body di halaman dokumentasi api").
 *
 * Operasi tanpa badan permintaan -- setiap GET, misalnya -- tak mendapat tabnya
 * sama sekali. Tab yang ada tetapi kosong terbaca sebagai halaman yang rusak,
 * dan daftar tab yang panjangnya berbeda-beda justru memberi tahu pembaca satu
 * hal berguna sekilas: endpoint ini menerima badan, yang itu tidak.
 */
const BENTUK_DASAR = ['curl', 'fetch', 'respons'];

function Blok({ judul, teks, testId, kepalaId, aksi = null }) {
  return (
    <div className="overflow-hidden rounded-lg border border-outline-variant">
      <div
        data-testid={kepalaId}
        className="flex items-center gap-sm border-b border-outline-variant bg-surface-variant px-md py-1"
      >
        <span className="text-label-sm uppercase tracking-wider text-on-surface-variant">
          {judul}
        </span>
        {aksi ? <div className="ml-auto">{aksi}</div> : null}
      </div>
      <pre
        data-testid={testId}
        className="overflow-x-auto bg-surface-variant p-md text-body-md leading-relaxed text-on-surface"
      >
        <code>{teks}</code>
      </pre>
    </div>
  );
}

/**
 * Pengalih curl / fetch / respons beserta tombol salin.
 *
 * TANPA tombol jalankan -- halaman ini tak pernah menembakkan permintaan, dan
 * itu pilihan tersurat pemilik produk.
 *
 * Tab `respons` menampilkan contoh BERHASIL dan GAGAL sekaligus, tidak
 * bergantian: yang ditanyakan adalah perbandingan dua bentuk envelope yang
 * memang berbeda -- yang gagal tak punya `data`, yang berhasil tak punya
 * `error`. Menyembunyikan salah satunya di balik tab lagi mengubur justru
 * perbedaan itu.
 */
export default function TabSnippet({ operasi }) {
  const [bentuk, setBentuk] = useState('curl');
  const teksBadan = badanPermintaan(operasi);
  const BENTUK = teksBadan ? ['curl', 'fetch', 'body', 'respons'] : BENTUK_DASAR;
  // null = belum dicoba, 'ok' = tersalin, 'gagal' = kedua jalur gagal.
  const [hasilSalin, setHasilSalin] = useState(null);

  const asal = typeof window === 'undefined' ? '' : window.location.origin;
  const berhasil = responsBerhasil(operasi);
  const gagal = responsGagal(operasi);
  const lain = kodeGalatLain(operasi);
  // Medan respons di luar `required`. Tanpa penanda ini seluruh medan terbaca
  // sama rata, padahal sebagiannya memang boleh tidak ada.
  const opsionalRespons = (operasi.skemaRespons?.properti ?? [])
    .filter((p) => !(operasi.skemaRespons.wajib ?? []).includes(p.nama))
    .map((p) => p.nama);

  const teksSalin =
    bentuk === 'curl'
      ? curlSnippet(operasi, { asal })
      : bentuk === 'fetch'
        ? fetchSnippet(operasi)
        : bentuk === 'body'
          ? teksBadan
          : berhasil;

  const labelSalin =
    bentuk === 'respons'
      ? `Salin contoh respons berhasil untuk ${operasi.metode} ${operasi.path}`
      : bentuk === 'body'
        ? `Salin contoh request body untuk ${operasi.metode} ${operasi.path}`
        : `Salin snippet ${bentuk} untuk ${operasi.metode} ${operasi.path}`;

  // TIDAK ADA `catch` kosong di sini lagi. `salinTeks` mengembalikan hasilnya,
  // dan kegagalan WAJIB terlihat: di `http://skema.local` Clipboard API memang
  // tak ada, dan versi pertama tombol ini gagal tanpa suara sama sekali.
  const salin = async () => {
    const berhasil = await salinTeks(teksSalin);
    setHasilSalin(berhasil ? 'ok' : 'gagal');
    setTimeout(() => setHasilSalin(null), 3000);
  };

  const TombolSalin = (
    <button
      type="button"
      onClick={salin}
      aria-label={labelSalin}
      className="flex min-h-[44px] items-center gap-2 rounded-lg px-sm text-label-sm font-medium text-on-surface-variant transition-colors hover:bg-outline-variant/40"
    >
      {hasilSalin === 'ok' ? <Check size={14} /> : null}
      {hasilSalin === 'gagal' ? <AlertTriangle size={14} /> : null}
      {hasilSalin === null ? <Copy size={14} /> : null}
      {hasilSalin === 'ok' ? 'Tersalin' : hasilSalin === 'gagal' ? 'Gagal — salin manual' : 'Salin'}
    </button>
  );

  return (
    <div className="mt-sm">
      <div className="flex items-center gap-sm">
        {BENTUK.map((b) => (
          <button
            key={b}
            type="button"
            onClick={() => setBentuk(b)}
            aria-pressed={bentuk === b}
            className={`min-h-[44px] rounded-lg px-md text-label-md font-medium transition-colors ${
              bentuk === b
                ? 'bg-primary/10 text-primary'
                : 'text-on-surface-variant hover:bg-surface-variant'
            }`}
          >
            {b}
          </button>
        ))}
      </div>

      {bentuk === 'body' && (
        <div className="mt-sm space-y-2">
          <Blok
            judul={`Request body: ${operasi.jenisBadan ?? 'application/json'}`}
            teks={teksBadan}
            testId="contoh-badan"
            kepalaId="kepala-badan"
            aksi={TombolSalin}
          />
          {/* Sama persis dengan isi snippet di sebelahnya, dan itu dinyatakan:
              pembaca yang menemukan keduanya berbeda perlu tahu bahwa itu
              cacat, bukan dua contoh yang memang berlainan maksud. */}
          <p className="text-body-md leading-relaxed text-on-surface-variant">
            Hanya kolom wajib yang ditampilkan, dan isinya sama dengan request body di dalam
            snippet curl maupun fetch. Kolom opsional ada di tabel di atas.
          </p>
        </div>
      )}

      {bentuk !== 'respons' && bentuk !== 'body' && (
        <div className="mt-sm">
          <Blok
            judul={bentuk}
            teks={teksSalin}
            testId={`snippet-${bentuk}`}
            kepalaId={`kepala-${bentuk}`}
            aksi={TombolSalin}
          />
        </div>
      )}

      {bentuk === 'respons' && (
        <div className="mt-sm space-y-sm">
          {/* PAGAR KEJUJURAN. Tanpa kalimat ini pembaca akan mengira kode galat
              di bawah adalah kontrak yang dideklarasikan API. */}
          <p className="text-body-md leading-relaxed text-on-surface-variant">
            Dokumen OpenAPI tidak mendeklarasikan respons galat. Contoh gagal di bawah diturunkan
            dari perilaku penyaring galat global yang diukur langsung ke API.
          </p>

          <div className="space-y-2">
            {!operasi.skemaRespons && (
              <p className="text-body-md leading-relaxed text-on-surface-variant">
                Skema respons endpoint ini belum dideklarasikan di OpenAPI, jadi isi data tidak
                dapat digambarkan.
              </p>
            )}
            <Blok
              judul={`Berhasil — ${operasi.statusSukses ?? 200}`}
              teks={berhasil}
              testId="contoh-berhasil"
              kepalaId="kepala-respons"
              aksi={TombolSalin}
            />
            {opsionalRespons.length > 0 && (
              <p className="text-body-md leading-relaxed text-on-surface-variant">
                Medan berikut tidak termasuk <code>required</code>, jadi dapat bernilai null atau
                tak dikirim: {opsionalRespons.join(', ')}.
              </p>
            )}
            {mungkinBerpaginasi(operasi) && (
              <p className="text-body-md leading-relaxed text-on-surface-variant">
                Endpoint berdaftar: <code>meta.pagination</code> dapat ikut terkirim.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Blok judul="Gagal" teks={gagal} testId="contoh-gagal" kepalaId="kepala-gagal" />
            {lain.length > 0 && (
              <div className="text-body-md leading-relaxed text-on-surface-variant">
                <p>Kode lain yang dapat muncul:</p>
                <ul className="mt-1 space-y-1">
                  {lain.map((k) => (
                    <li key={k}>{k}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
