'use client';

import React, { useEffect, useRef } from 'react';
import { siteKeyCaptcha } from '../utils/captcha';

const ALAMAT_SKRIP = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

/**
 * Widget Cloudflare Turnstile untuk pengisian survei TANPA sesi
 * (14 September 2026).
 *
 * TANPA site key widget ini tak merender apa pun. Itu keadaan pengembangan
 * tanpa akun Cloudflare, dan backend pun mematikan verifikasinya di luar
 * produksi -- keduanya mati bersamaan, sehingga tak ada layar yang menuntut
 * sesuatu yang tak dapat dipenuhi. Di produksi keduanya menyala bersamaan pula:
 * TurnstileService menolak menyala tanpa rahasianya.
 *
 * Site key memang untuk dipajang. Ia tertanam di HTML dan siapa pun yang
 * membuka halaman dapat membacanya; yang wajib dirahasiakan hanya secret key
 * di sisi server.
 */
export default function TurnstileWidget({ onToken, className = '' }) {
  const wadahRef = useRef(null);
  const idWidgetRef = useRef(null);
  // Disimpan di ref, bukan ikut dependensi efek: pemanggil umumnya menuliskan
  // `onToken` sebagai fungsi baru tiap render, dan memasukkannya ke dependensi
  // akan memasang ulang widget berkali-kali -- tiap pemasangan meminta
  // penilaian baru ke Cloudflare.
  const onTokenRef = useRef(onToken);
  // Disegarkan lewat efek, bukan saat render: menulis ref di badan komponen
  // membuat nilainya berbeda antara render yang dibuang dan yang dipakai.
  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  const siteKey = siteKeyCaptcha();

  useEffect(() => {
    if (!siteKey) return undefined;

    let dibatalkan = false;

    const pasang = () => {
      if (dibatalkan || !wadahRef.current || !window.turnstile) return;
      if (idWidgetRef.current !== null) return;

      idWidgetRef.current = window.turnstile.render(wadahRef.current, {
        sitekey: siteKey,
        callback: (token) => onTokenRef.current?.(token),
        // Token Turnstile kedaluwarsa dalam hitungan menit, sedangkan mengisi
        // survei bisa lebih lama. Dikosongkan supaya formulir tak mengirim
        // token basi yang ditolak server tanpa pengisinya tahu sebabnya;
        // widget meminta yang baru sendiri.
        'expired-callback': () => onTokenRef.current?.(null),
        'error-callback': () => onTokenRef.current?.(null),
        'refresh-expired': 'auto',
      });
    };

    if (window.turnstile) {
      pasang();
    } else {
      // Satu tag skrip untuk seluruh aplikasi: memuatnya dua kali membuat
      // Cloudflare memperingatkan dan dapat menggandakan widget.
      let skrip = document.querySelector(`script[src="${ALAMAT_SKRIP}"]`);
      if (!skrip) {
        skrip = document.createElement('script');
        skrip.src = ALAMAT_SKRIP;
        skrip.async = true;
        skrip.defer = true;
        document.head.appendChild(skrip);
      }
      skrip.addEventListener('load', pasang);
    }

    return () => {
      dibatalkan = true;
      if (idWidgetRef.current !== null && window.turnstile?.remove) {
        window.turnstile.remove(idWidgetRef.current);
        idWidgetRef.current = null;
      }
      // Token ikut dikosongkan. Widget yang dipasang ulang -- misalnya karena
      // modalnya ditutup lalu dibuka lagi -- membawa tantangan baru, sedangkan
      // token lama masih tersimpan di store; tombol kirim akan tampak hidup
      // dengan token basi yang pasti ditolak server.
      onTokenRef.current?.(null);
    };
  }, [siteKey]);

  if (!siteKey) return null;

  return <div ref={wadahRef} data-testid="turnstile" className={className} />;
}
