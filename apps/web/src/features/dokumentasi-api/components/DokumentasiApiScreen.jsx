'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import { useAsync } from '@/hooks/useAsync';
import { getDokumentasiOperasi, getDokumenMentah } from '../services/dokumentasi.api';
import GrupOperasi from './GrupOperasi';

export default function DokumentasiApiScreen() {
  const [cari, setCari] = useState('');
  const [dibukaManual, setDibukaManual] = useState(() => new Set());
  const [sedangUnduh, setSedangUnduh] = useState(false);

  // `useAsync` + LoadingState/ErrorState adalah pola yang sudah dipakai halaman
  // admin-kab lain (lihat audit-logs). Menulis useEffect sendiri di sini berarti
  // memperkenalkan pola kedua untuk pekerjaan yang sama.
  const ambil = useCallback(() => getDokumentasiOperasi(), []);
  const { data: grup, isLoading, error, refetch } = useAsync(ambil);

  const kunci = cari.trim().toLowerCase();
  const mencari = kunci.length > 0;

  const tersaring = useMemo(() => {
    if (!grup) return null;
    if (!kunci) return grup;
    return grup
      .map((g) => ({
        ...g,
        operasi: g.operasi.filter(
          (o) =>
            o.path.toLowerCase().includes(kunci) ||
            o.metode.toLowerCase().includes(kunci) ||
            (o.ringkasan ?? '').toLowerCase().includes(kunci),
        ),
      }))
      .filter((g) => g.operasi.length > 0);
  }, [grup, kunci]);

  // Mencari MEMBUKA grup yang cocok dengan sendirinya. Tanpa ini pencarian pada
  // halaman bergrup tertutup terbaca seperti pencarian yang gagal: jumlah
  // endpoint berubah, isinya tetap tersembunyi.
  const terbuka = (tag) => mencari || dibukaManual.has(tag);

  const alihkanGrup = (tag) =>
    setDibukaManual((lama) => {
      const baru = new Set(lama);
      if (baru.has(tag)) baru.delete(tag);
      else baru.add(tag);
      return baru;
    });

  const semuaTerbuka = (tersaring?.length ?? 0) > 0 && tersaring.every((g) => terbuka(g.tag));

  /**
   * Tautan langsung ke satu endpoint. Hash memuat `/` dan `{}` -- keduanya
   * dikodekan, jadi dibaca kembali dengan `decodeURIComponent`.
   *
   * Grup yang memuatnya dibuka SEBELUM digulir; tanpa itu sasarannya belum ada
   * di DOM dan gulirannya tak menuju ke mana pun.
   */
  useEffect(() => {
    if (!grup || typeof window === 'undefined') return;
    const hash = window.location.hash.slice(1);
    if (!hash) return;

    const id = decodeURIComponent(hash);
    const pemilik = grup.find((g) => g.operasi.some((o) => o.id === id));
    if (!pemilik) return;

    // setState DITUNDA keluar dari badan efek. Memanggilnya langsung di sini
    // memicu render berantai, dan `react-hooks/set-state-in-effect` memerahkan
    // itu -- aturan yang sama yang sudah menandai `useAsync`.
    let tundaGulir;
    const tundaBuka = setTimeout(() => {
      setDibukaManual((lama) => new Set(lama).add(pemilik.tag));
      // Satu putaran lagi supaya isi grupnya sudah tergambar sebelum digulir.
      tundaGulir = setTimeout(() => {
        // `scrollIntoView` TIDAK ada di jsdom, dan gulirannya memang penyedap
        // saja -- grupnya sudah terbuka entah ia berjalan atau tidak.
        document.getElementById(id)?.scrollIntoView?.({ block: 'start' });
      }, 0);
    }, 0);

    return () => {
      clearTimeout(tundaBuka);
      clearTimeout(tundaGulir);
    };
  }, [grup]);

  const unduhDokumen = async () => {
    setSedangUnduh(true);
    try {
      const dokumen = await getDokumenMentah();
      const blob = new Blob([JSON.stringify(dokumen, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const tautan = document.createElement('a');
      tautan.href = url;
      tautan.download = 'openapi-skema.json';
      document.body.appendChild(tautan);
      tautan.click();
      tautan.remove();
      // WAJIB dicabut: tanpa ini blob-nya menggantung di memori sampai tab ditutup.
      URL.revokeObjectURL(url);
    } finally {
      setSedangUnduh(false);
    }
  };

  const alihkanSemua = () =>
    setDibukaManual(semuaTerbuka ? new Set() : new Set((tersaring ?? []).map((g) => g.tag)));

  if (error) {
    return (
      <ErrorState
        title="Gagal memuat dokumentasi API"
        description={error.message}
        onRetry={refetch}
      />
    );
  }

  return (
    <div className="space-y-md">
      <div>
        <div className="flex flex-wrap items-center gap-sm">
          <h1 className="font-h2 text-h2 text-on-surface">Dokumentasi API</h1>
          <button
            type="button"
            onClick={unduhDokumen}
            disabled={sedangUnduh}
            className="ml-auto min-h-[44px] rounded-lg border border-border px-md text-label-md font-medium text-on-surface-variant transition-colors hover:bg-surface-variant disabled:opacity-60"
          >
            {sedangUnduh ? 'Menyiapkan…' : 'Unduh dokumen OpenAPI'}
          </button>
        </div>
        <p className="mt-2 max-w-prose text-body-lg leading-relaxed text-on-surface-variant">
          Daftar ini dibuat langsung dari kode API, jadi isinya selalu sesuai dengan yang berjalan
          sekarang. Snippet di bawah untuk <strong>disalin</strong> — halaman ini tidak mengirim
          permintaan apa pun.
        </p>
      </div>

      {/* ENVELOPE DIJELASKAN SEKALI DI SINI. OpenAPI tak memuatnya: skema per
          endpoint menggambarkan isi `data` saja, sementara API sungguhnya
          membungkus setiap respons sukses. Tanpa penjelasan ini halaman akan
          mendokumentasikan bentuk yang tak pernah dikirim.

          Ditulis sebagai daftar berjudul, bukan paragraf: versi pertama
          menaruh empat fakta berbeda dalam dua paragraf rapat, dan pembaca
          harus menahan semuanya sekaligus. */}
      <div
        data-testid="penjelasan-envelope"
        className="rounded-xl border border-border bg-surface-variant p-md"
      >
        <h2 className="text-label-md font-semibold uppercase tracking-wider text-on-surface-variant">
          Yang perlu diketahui sebelum menyalin
        </h2>
        <dl className="mt-sm space-y-sm text-body-md leading-relaxed">
          <div>
            <dt className="font-semibold text-on-surface">Bentuk respons sukses</dt>
            <dd className="text-on-surface-variant">
              <code>{'{ success, statusCode, message, data, meta }'}</code>
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-on-surface">Bentuk respons gagal</dt>
            <dd className="text-on-surface-variant">
              <code>{'{ success, statusCode, message, error, meta }'}</code> — bentuk yang berbeda,
              tanpa <code>data</code>. <code>error.details</code> berupa teks, kecuali pada
              kegagalan validasi (400) yang mengirimnya sebagai daftar pesan.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-on-surface">Isi meta</dt>
            <dd className="text-on-surface-variant">
              Selalu memuat <code>timestamp</code> dan <code>path</code>.{' '}
              <code>meta.pagination</code> hanya menyusul pada endpoint berdaftar yang berpaginasi.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-on-surface">Skema di tiap endpoint</dt>
            <dd className="text-on-surface-variant">
              Menggambarkan isi <code>data</code> saja, bukan seluruh pembungkusnya. Contoh
              utuhnya — berhasil maupun gagal — ada di tab <strong>respons</strong> tiap endpoint.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-on-surface">Unduhan ekspor</dt>
            <dd className="text-on-surface-variant">
              Mengembalikan berkas mentah, tanpa pembungkus apa pun.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-on-surface">
              Tanda <code>&lt;token&gt;</code> pada snippet curl
            </dt>
            <dd className="text-on-surface-variant">
              Diganti nilai cookie <code>session</code> milikmu. Jangan tempelkan ke tiket atau
              grup percakapan — itu setara kata sandi.
            </dd>
          </div>
        </dl>
      </div>

      <div className="flex flex-col gap-sm sm:flex-row sm:items-end">
        <label className="block flex-1" htmlFor="cari-endpoint">
          <span className="text-label-md font-medium text-on-surface-variant">Cari endpoint</span>
          <input
            id="cari-endpoint"
            type="search"
            aria-label="Cari endpoint"
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="mis. surveys, POST, pengaduan"
            className="mt-2 block min-h-[44px] w-full rounded-lg border border-border bg-white px-md py-sm text-body-md text-on-surface outline-none transition-colors hover:border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>

        {/* Tombol ini TIDAK ditampilkan selagi mencari: hasil pencarian sudah
            terbuka dengan sendirinya, jadi tombolnya akan terbaca sebagai
            kendali yang tak mengubah apa pun. */}
        {!mencari && tersaring?.length > 0 && (
          <button
            type="button"
            onClick={alihkanSemua}
            className="min-h-[44px] shrink-0 rounded-lg border border-border px-md text-label-md font-medium text-on-surface-variant transition-colors hover:bg-surface-variant"
          >
            {semuaTerbuka ? 'Tutup semua' : 'Buka semua'}
          </button>
        )}
      </div>

      {isLoading && <LoadingState label="Memuat dokumentasi API..." />}

      {tersaring !== null && tersaring.length === 0 && (
        <p className="text-body-md leading-relaxed text-on-surface-variant">
          {grup?.length
            ? 'Tidak ada endpoint yang cocok dengan pencarian.'
            : 'Belum ada endpoint yang terdaftar.'}
        </p>
      )}

      {tersaring?.map((g) => (
        <GrupOperasi
          key={g.tag}
          tag={g.tag}
          operasi={g.operasi}
          dibuka={terbuka(g.tag)}
          onToggle={() => alihkanGrup(g.tag)}
        />
      ))}
    </div>
  );
}
