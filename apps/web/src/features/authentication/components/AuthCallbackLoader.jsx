'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ROLE_HOME } from '@/constants/roleHome';
import Button from '@/components/ui/Button';
import ErrorState from '@/components/ui/ErrorState';
import LoadingState from '@/components/ui/LoadingState';
import { authApi, getSsoLoginUrl } from '../services/sso.api';
import { clearSession, saveSsoSession } from '../services/authStorage';
import RoleLoginPicker from './RoleLoginPicker';
import { getMyRoles } from '../services/actingRole.api';

/**
 * Halaman pendaratan setelah callback SSO Helpdesk (`/sso/callback`).
 *
 * ALUR LENGKAPNYA, supaya jelas apa yang TIDAK terjadi di sini:
 *   1. Backend (`GET /auth/sso/callback`) sudah menukar `code`, mencocokkan
 *      penggunanya, menerbitkan token sesi, dan menitipkannya sebagai cookie
 *      `session` HttpOnly. Semua bagian rahasianya selesai di sana.
 *   2. Ia lalu MENGALIHKAN peramban ke halaman ini dengan fragment `#expires=`
 *      (berhasil) atau `#error=` (gagal). TIDAK ADA token di alamat ini.
 *   3. Halaman ini cuma menanyakan "saya siapa" lewat `GET /auth/me` — cookie-nya
 *      terkirim sendiri oleh peramban — lalu menyimpan keterangan pendamping
 *      (peran & waktu kedaluwarsa) dan mengantar pengguna ke berandanya.
 *
 * Fragment dibaca dari `window.location.hash`, BUKAN `useSearchParams`: bagian
 * setelah '#' tak pernah dikirim ke server, jadi ia hanya ada di sisi klien —
 * dan justru itu alasan backend memakai fragment (tak masuk log akses).
 *
 * Hash langsung dihapus dari alamat setelah dibaca supaya pesan galat tak
 * tertinggal di bilah alamat dan tak ikut terbawa bila pengguna menyalin URL.
 */
export default function AuthCallbackLoader() {
  // 'memuat' | 'gagal' | 'pilih-peran' — keadaan 'berhasil' tak pernah terlihat
  // karena berujung pada navigasi keluar dari halaman ini.
  const [status, setStatus] = useState('memuat');
  const [message, setMessage] = useState('');
  const [pemilih, setPemilih] = useState(null);
  // Callback SSO sekali pakai: `code` sudah ditukar backend dan cookie `state`
  // sudah dibuang, jadi menjalankan ulang efek ini (mis. Strict Mode di dev)
  // tak boleh memanggil /auth/me dua kali.
  const sudahJalan = useRef(false);

  useEffect(() => {
    if (sudahJalan.current) return;
    sudahJalan.current = true;

    const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    window.history.replaceState(null, '', window.location.pathname);

    const galat = fragment.get('error');
    if (galat) {
      // Sesi lokal apa pun yang tertinggal ikut dibuang: pengguna JELAS tidak
      // berhasil masuk, dan meninggalkan artefak sesi lama membuat navbar
      // menampilkan keadaan "sudah masuk" di atas halaman galat ini.
      clearSession();
      setMessage(galat);
      setStatus('gagal');
      return;
    }

    const expiresAt = Number(fragment.get('expires'));

    // `/auth/roles`, BUKAN `/auth/me`: akun ber-role banyak belum memilih peran
    // pada titik ini, dan /auth/me menolaknya 401 justru karena itu (ditemukan
    // saat verifikasi di peramban, 6 September 2026).
    getMyRoles()
      .then((data) => {
        const roles = data?.roles ?? [];
        const actingRole = roles.length === 1 ? roles[0] : null;
        saveSsoSession(actingRole, expiresAt, data?.consentRequired);

        // Pemilih peran untuk SIAPA PUN ber-role lebih dari satu (5 September
        // 2026), bukan khusus superuser.
        if (roles.length > 1) {
          setPemilih({
            nama: data?.nama ?? '',
            roles,
            opdId: data?.opdId ?? null,
          });
          setStatus('pilih-peran');
          return;
        }

        // Navigasi HARD (bukan router.push) SENGAJA — proxy.js membaca cookie
        // lewat full request, jadi cookie `role` yang baru ditulis harus ikut
        // terkirim pada permintaan berikutnya.
        window.location.assign(ROLE_HOME[actingRole ?? roles[0]] ?? '/');
      })
      .catch((err) => {
        // Sampai di sini berarti backend sudah menerbitkan sesi tapi kita gagal
        // membacanya — hampir selalu masalah konfigurasi, bukan kesalahan
        // pengguna: cookie tak sampai (SESSION_COOKIE_DOMAIN belum diisi di
        // produksi), atau origin frontend belum ada di CORS_ORIGIN.
        clearSession();
        setMessage(err.message || 'Sesi tidak dapat dibaca setelah masuk.');
        setStatus('gagal');
      });
  }, []);

  if (status === 'pilih-peran') {
    return (
      <RoleLoginPicker
        userName={pemilih?.nama}
        roles={pemilih?.roles ?? []}
        opdId={pemilih?.opdId ?? null}
        // Menutup pemilih = MEMBATALKAN login, sama seperti pada dev-login:
        // meninggalkan pengguna dengan sesi tersimpan di halaman callback yang
        // kosong adalah keadaan setengah masuk yang membingungkan.
        onCancel={() => {
          void authApi.logout().catch(() => {});
          clearSession();
          window.location.assign('/');
        }}
      />
    );
  }

  if (status === 'gagal') {
    return (
      <div className="flex flex-col items-center">
        <ErrorState title="Gagal masuk lewat SSO Helpdesk" description={message} />
        <div className="flex flex-wrap items-center justify-center gap-3 -mt-12 pb-12">
          <Button onClick={() => window.location.assign(getSsoLoginUrl())}>Coba masuk lagi</Button>
          <Button variant="secondary" onClick={() => window.location.assign('/')}>
            Kembali ke beranda
          </Button>
        </div>
      </div>
    );
  }

  return <LoadingState label="Menyelesaikan proses masuk..." />;
}
