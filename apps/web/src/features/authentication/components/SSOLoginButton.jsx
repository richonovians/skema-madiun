'use client';

import React, { useState } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { authApi, getSsoLoginUrl } from '../services/sso.api';
import { saveSession, clearSession } from '../services/authStorage';
import { ROLE_HOME } from '@/constants/roleHome';
import RoleLoginPicker from './RoleLoginPicker';

/**
 * Tombol masuk. Sejak 2026-08-27 ada DUA jalur, dan keduanya memang perlu ada:
 *
 * - **SSO Helpdesk (utama).** Navigasi tingkat atas ke `GET /auth/sso/login`,
 *   yang menyetel cookie `state` lalu mengalihkan ke halaman login Helpdesk.
 *   Pengguna kembali ke `/sso/callback` (lihat AuthCallbackLoader.jsx). Tak ada
 *   token yang pernah disentuh JavaScript di jalur ini — backend
 *   menitipkannya sebagai cookie HttpOnly.
 * - **dev-login (cadangan, hanya di lingkungan pengembangan).** Tetap
 *   dipertahankan karena SSO Helpdesk menuntut `client_id`/`client_secret` yang
 *   diberikan tim Helpdesk; tanpa itu `GET /auth/sso/login` menjawab 503 dan
 *   aplikasi ini tak dapat diuji sama sekali. Backend memagarinya dengan
 *   NonProductionGuard (404 di produksi), jadi jalur ini tak mungkin dipakai
 *   dari lingkungan sungguhan — pemeriksaan di bawah hanya menyembunyikan
 *   kolomnya supaya tak menimbulkan salah paham di layar publik.
 */
const IS_DEV = process.env.NODE_ENV !== 'production';

export default function SSOLoginButton() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // Navigasi ke Helpdesk memakan waktu yang terlihat (permintaan ke luar +
  // dokumen penemuan OIDC di sisi backend). Tanpa penanda ini tombolnya tampak
  // tak merespons dan mudah diklik berkali-kali.
  const [isRedirecting, setIsRedirecting] = useState(false);
  // Terisi HANYA bila yang login berperan `superuser` -- memicu pemilih peran.
  // Peran lain (termasuk Admin Kabupaten) tak pernah melewati jalur ini. Objek
  // (bukan string) supaya nama yang kosong tak salah dibaca sebagai "tak ada
  // pemilih".
  const [rolePicker, setRolePicker] = useState(null);

  // Sesi lokal sisa (mis. dev-login yang belum di-logout) dibuang SEBELUM
  // berpindah: kalau tidak, cookie `role` lama masih menempel saat pengguna
  // kembali dari Helpdesk, dan proxy.js bisa mengurungnya di area yang salah
  // pada beberapa permintaan pertama.
  const handleSsoLogin = () => {
    setIsRedirecting(true);
    // `clearSession()` sudah membuang cookie `role` (peran yang dipakai);
    // `clearSuperuserArea()` yang dulu dipanggil di sini ikut hilang bersama
    // cookie `area`/`opd` (5 September 2026).
    clearSession();
    // `location.assign` (bukan router.push): tujuannya di luar aplikasi ini.
    window.location.assign(getSsoLoginUrl());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const res = await authApi.devLogin(identifier);
      const pengguna = res.data.user;
      const roles = pengguna?.roles ?? [];
      // `actingRole` null berarti akun ber-role banyak yang belum memilih --
      // backend sengaja tak memilihkannya (lihat resolveActingRole).
      const actingRole = pengguna?.actingRole ?? null;
      saveSession(res.data.token, actingRole, pengguna?.consentRequired);

      // Pemilih peran kini untuk SIAPA PUN ber-role lebih dari satu, bukan
      // khusus superuser (5 September 2026). Akun ber-role tunggal tak melihat
      // langkah ini sama sekali -- backend pun tak menuntutnya memilih.
      if (roles.length > 1) {
        setRolePicker({
          name: pengguna?.nama ?? '',
          roles,
          opdId: pengguna?.opdId ?? null,
        });
        return; // `finally` di bawah tetap mematikan status memuat
      }

      // SEBELUMNYA cuma reload halaman saat ini (biasanya beranda publik) --
      // admin harus navigasi manual sendiri ke /admin-kab atau /admin-opd
      // (2026-08-06, laporan bug user). `window.location.href` (bukan
      // router.push) SENGAJA -- proxy.js baca cookie via full request,
      // butuh navigasi hard agar cookie `role` yang baru saja ditulis
      // langsung terbaca proxy pada request berikutnya.
      //
      // Tujuannya tetap ROLE_HOME walau warga belum menyetujui PDP: proxy yang
      // memantulkannya ke /persetujuan. Menyalin keputusan itu ke sini berarti
      // dua tempat harus mengingat aturan yang sama.
      window.location.href = ROLE_HOME[actingRole ?? roles[0]] ?? '/';
    } catch (err) {
      setError(err.message || 'Login gagal');
    } finally {
      setIsLoading(false);
    }
  };

  // Menutup pemilih = MEMBATALKAN login, bukan meninggalkan pengguna dalam
  // keadaan setengah masuk (sesi tersimpan tapi masih di halaman publik, yang
  // membuat navbar menampilkan avatar tanpa pernah berpindah area).
  const handleCancelRolePicker = () => {
    clearSession();
    setRolePicker(null);
    setIdentifier('');
    setIsFormOpen(false);
  };

  if (rolePicker) {
    return (
      <RoleLoginPicker
        userName={rolePicker.name}
        roles={rolePicker.roles}
        opdId={rolePicker.opdId}
        onCancel={handleCancelRolePicker}
      />
    );
  }

  if (!isFormOpen) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="navLogin" onClick={handleSsoLogin} disabled={isRedirecting}>
          {isRedirecting ? 'Mengalihkan...' : 'Masuk via SSO Helpdesk'}
        </Button>
        {IS_DEV && (
          <button
            type="button"
            onClick={() => setIsFormOpen(true)}
            className="text-xs font-semibold text-slate-400 hover:text-slate-600 underline underline-offset-2 whitespace-nowrap"
            title="Masuk dengan akun seed tanpa Helpdesk — hanya tersedia di lingkungan pengembangan"
          >
            akun dev
          </button>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
      <Input
        type="text"
        placeholder="Email akun (dev-login)"
        value={identifier}
        onChange={(e) => setIdentifier(e.target.value)}
        className="w-56"
        required
      />
      <Button type="submit" variant="navLogin" disabled={isLoading}>
        {isLoading ? 'Memproses...' : 'Masuk'}
      </Button>
      <button
        type="button"
        onClick={() => {
          setIsFormOpen(false);
          setError('');
        }}
        className="text-xs font-semibold text-slate-400 hover:text-slate-600 underline underline-offset-2 whitespace-nowrap"
      >
        pakai SSO
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </form>
  );
}
