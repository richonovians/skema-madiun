'use client';

import React from 'react';
import { ALAMAT_PELAPORAN } from './error';

/**
 * Batas galat paling luar: dipakai Next hanya ketika ROOT LAYOUT sendiri yang
 * gagal (25 September 2026).
 *
 * Karena ia MENGGANTIKAN root layout, ia wajib merender `<html>` dan `<body>`
 * sendiri. `lang="id"` ikut dipasang di sini sebab atribut milik layout tak
 * pernah sempat ada; tanpanya pembaca layar melafalkan halaman ini sebagai
 * bahasa Inggris.
 *
 * GAYA DITULIS SEBARIS, bukan dengan kelas Tailwind, dan itu disengaja.
 * `globals.css` diimpor oleh layout.jsx; pada keadaan yang memunculkan berkas
 * ini, justru berkas itu yang sedang gagal. Halaman terakhir yang dilihat
 * pengguna tak boleh bergantung pada apa pun yang bisa ikut rusak. Alasan sama
 * yang membuatnya tak memakai ErrorState maupun Button.
 *
 * "Muat ulang", bukan `reset`: bila yang gagal adalah layout, merender ulang
 * cabang yang sama biasanya menghasilkan kegagalan yang sama.
 *
 * Isinya dipisah sebagai `IsiGalatGlobal` supaya dapat diuji tanpa menyarangkan
 * `<html>` di dalam `<div>` milik jsdom, yang cuma memicu peringatan tanpa
 * membuktikan apa pun.
 */
const gaya = {
  body: {
    margin: 0,
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    backgroundColor: '#f8fafc',
    color: '#0f172a',
    fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
  },
  kotak: { maxWidth: '480px', textAlign: 'center' },
  judul: { fontSize: '24px', lineHeight: 1.3, margin: '0 0 12px' },
  teks: { fontSize: '16px', lineHeight: 1.6, margin: '0 0 24px', color: '#475569' },
  kode: { fontSize: '14px', fontFamily: 'ui-monospace, monospace', color: '#475569', margin: '0 0 24px' },
  tombol: {
    minHeight: '44px',
    padding: '0 20px',
    fontSize: '16px',
    fontWeight: 500,
    color: '#ffffff',
    backgroundColor: '#004ac6',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
  },
};

export function IsiGalatGlobal({ digest, onMuatUlang }) {
  return (
    <div style={gaya.kotak}>
      <h1 style={gaya.judul}>Terjadi gangguan</h1>
      <p style={gaya.teks}>
        Kami tidak dapat menampilkan halaman ini. Silakan muat ulang. Bila terus terjadi, laporkan
        ke {ALAMAT_PELAPORAN} dengan menyertakan kode di bawah.
      </p>
      {digest && <p style={gaya.kode}>Kode: {digest}</p>}
      <button type="button" style={gaya.tombol} onClick={onMuatUlang}>
        Muat ulang halaman
      </button>
    </div>
  );
}

export default function GlobalError({ error }) {
  return (
    <html lang="id">
      <body style={gaya.body}>
        <IsiGalatGlobal
          digest={error?.digest}
          onMuatUlang={() => {
            window.location.reload();
          }}
        />
      </body>
    </html>
  );
}
