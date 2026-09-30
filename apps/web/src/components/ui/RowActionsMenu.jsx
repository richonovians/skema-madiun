'use client';

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { MoreVertical } from 'lucide-react';

/**
 * Menu aksi untuk SATU baris tabel — tombol titik-tiga beserta daftarnya.
 *
 * DIGAMBAR LEWAT PORTAL, dan itu bukan pilihan melainkan keharusan. Tabel di
 * aplikasi ini duduk di dalam wadah `overflow-x-auto`; menu ber-`position:
 * absolute` akan DIPOTONG wadah itu, sehingga separuh butirnya tak terlihat dan
 * tak dapat ditekan. Masalah yang sama pernah menimpa RoleLoginPicker (8
 * September 2026) dan penyelesaiannya sama: gambar di `document.body`, lalu
 * hitung tempatnya dari kotak tombolnya.
 *
 * `position: fixed` DENGAN koordinat terhitung, bukan `absolute`: begitu
 * panelnya pindah ke `document.body`, tak ada lagi leluhur yang dapat dijadikan
 * patokan.
 *
 * Bentuk butirnya mengikuti EksporMenu — `<ul role="menu">` dengan anak
 * `role="menuitem"` — supaya kedua menu di aplikasi ini berperilaku sama bagi
 * pembaca layar. Yang DITAMBAHKAN di sini: Escape menutup dan fokus kembali ke
 * tombolnya. EksporMenu belum punya itu, dan sengaja tidak saya ubah dalam
 * pekerjaan ini.
 *
 * @param {string} label Nama aksesibel tombolnya. WAJIB menyebut pemilik
 *   barisnya: pada daftar panjang akan ada belasan tombol berfungsi sama, dan
 *   nama yang identik membuat pembaca layar tak dapat membedakannya.
 * @param {Array} items Butir menu. Entri `false`/`null` dibuang, supaya
 *   pemanggil boleh menulis `syarat && { ... }` tanpa penjaga tambahan.
 *   Bentuk tiap butir:
 *   - `key`            pembeda React
 *   - `label`          teksnya
 *   - `icon`           elemen ikon (opsional)
 *   - `href`           bila butirnya TAUTAN (dirender `next/link`)
 *   - `onSelect`       bila butirnya AKSI
 *   - `tone`           'danger' untuk aksi merusak
 *   - `disabled`       mematikan butirnya
 *   - `keterangan`     satu baris alasan; dipakai bersama `disabled`
 *   - `pemisahSebelum` garis pemisah di atas butir ini
 */
const LEBAR_MENU = 224; // px, sepadan dengan w-56
const JARAK_TEPI = 8; // px, jarak minimal panel dari tepi layar

export default function RowActionsMenu({ label, items = [] }) {
  const [terbuka, setTerbuka] = useState(false);
  const [posisi, setPosisi] = useState(null);
  const tombolRef = useRef(null);
  const panelRef = useRef(null);

  const butir = items.filter(Boolean);

  const tutup = useCallback((kembalikanFokus = false) => {
    setTerbuka(false);
    setPosisi(null);
    if (kembalikanFokus) tombolRef.current?.focus();
  }, []);

  const hitungPosisi = useCallback(() => {
    const el = tombolRef.current;
    if (!el) return;
    const kotak = el.getBoundingClientRect();
    // Tepi KANAN panel disejajarkan dengan tepi kanan tombol, lalu dijepit
    // supaya tak keluar layar. Penjepitan ini pelajaran dari EksporMenu
    // (16 September 2026): pada 320px, panel yang dipatok ke kanan tombol di
    // tepi tabel berakhir dengan tepi kiri negatif dan hurufnya terpotong.
    const kiri = Math.min(
      Math.max(JARAK_TEPI, kotak.right - LEBAR_MENU),
      Math.max(JARAK_TEPI, window.innerWidth - LEBAR_MENU - JARAK_TEPI),
    );
    setPosisi({ top: kotak.bottom + 4, left: kiri });
  }, []);

  useLayoutEffect(() => {
    if (terbuka) hitungPosisi();
  }, [terbuka, hitungPosisi]);

  useEffect(() => {
    if (!terbuka) return undefined;

    const tutupBilaDiLuar = (e) => {
      if (tombolRef.current?.contains(e.target)) return;
      if (panelRef.current?.contains(e.target)) return;
      // TANPA mengembalikan fokus: pengguna sedang menuju tempat lain, dan
      // merebut fokus ke tombol ini akan melawan maksudnya.
      tutup(false);
    };
    const tanganiTombol = (e) => {
      if (e.key === 'Escape') tutup(true);
    };
    // `capture` supaya guliran wadah tabel ikut terbaca, bukan hanya guliran
    // jendela: panel `fixed` tidak bergerak sendiri mengikuti wadahnya.
    const perbarui = () => hitungPosisi();

    document.addEventListener('mousedown', tutupBilaDiLuar);
    document.addEventListener('keydown', tanganiTombol);
    window.addEventListener('scroll', perbarui, true);
    window.addEventListener('resize', perbarui);
    return () => {
      document.removeEventListener('mousedown', tutupBilaDiLuar);
      document.removeEventListener('keydown', tanganiTombol);
      window.removeEventListener('scroll', perbarui, true);
      window.removeEventListener('resize', perbarui);
    };
  }, [terbuka, tutup, hitungPosisi]);

  const pilih = (item) => {
    if (item.disabled) return;
    tutup(false);
    item.onSelect?.();
  };

  const kelasButir = (item) =>
    [
      'w-full text-left px-4 py-2.5 text-sm flex items-start gap-2 transition-colors',
      item.disabled
        ? 'text-outline-variant cursor-not-allowed'
        : item.tone === 'danger'
          ? 'text-error hover:bg-error-container'
          : 'text-text-secondary hover:bg-surface-container-low hover:text-text-primary',
    ].join(' ');

  const isiButir = (item) => (
    <>
      {item.icon ? <span className="mt-0.5 shrink-0">{item.icon}</span> : null}
      <span className="min-w-0">
        <span className="block">{item.label}</span>
        {item.keterangan ? (
          <span className="block text-xs text-text-secondary mt-0.5 leading-snug">
            {item.keterangan}
          </span>
        ) : null}
      </span>
    </>
  );

  const panel =
    terbuka && posisi && typeof document !== 'undefined'
      ? createPortal(
          <ul
            ref={panelRef}
            /* `<ul role="menu">` dengan anak `role="menuitem"` adalah pola menu
               WAI-ARIA yang kanonis, jadi aturan ini salah tuduh di sini.
               Menurutinya berarti mengganti `<ul>` menjadi `<div>` tanpa
               membuat menunya lebih dapat diakses sedikit pun. */
            // eslint-disable-next-line jsx-a11y/no-noninteractive-element-to-interactive-role
            role="menu"
            aria-label={label}
            style={{ top: posisi.top, left: posisi.left, width: LEBAR_MENU }}
            className="fixed max-w-[calc(100vw-1rem)] bg-surface border border-border rounded-xl shadow-lg overflow-hidden z-[9999] py-1"
          >
            {butir.map((item) => (
              <li key={item.key} className={item.pemisahSebelum ? 'border-t border-border mt-1 pt-1' : undefined}>
                {item.href ? (
                  <Link href={item.href} role="menuitem" className={kelasButir(item)} onClick={() => tutup(false)}>
                    {isiButir(item)}
                  </Link>
                ) : (
                  <button
                    type="button"
                    role="menuitem"
                    disabled={item.disabled}
                    onClick={() => pilih(item)}
                    className={kelasButir(item)}
                  >
                    {isiButir(item)}
                  </button>
                )}
              </li>
            ))}
          </ul>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        ref={tombolRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={terbuka}
        onClick={() => (terbuka ? tutup(false) : setTerbuka(true))}
        /* 44x44 -- batas bawah sasaran sentuh. Tombol ini menggantikan tiga
           tombol lepas, jadi ia satu-satunya jalan ke aksi barisnya; mengecilkannya
           berarti membuat seluruh aksi baris sukar disentuh. */
        className="h-11 w-11 inline-flex items-center justify-center rounded-lg text-text-secondary hover:bg-slate-100 hover:text-text-primary transition-colors"
      >
        <MoreVertical size={18} />
      </button>
      {panel}
    </>
  );
}
