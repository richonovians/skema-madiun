'use client';

import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
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
const ID_GALAT = 'galat-dev-login';

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

  // `relative` di sini cuma jadi JANGKAR bagi galat di bawah -- itu inti
  // perbaikan 7 September 2026.
  //
  // Dulu galatnya sekadar `<span>` yang menjadi anggota flex keempat pada baris
  // ini. Begitu backend menjawab (pesannya panjang -- "Pengguna dengan
  // email/ssoSubject "..." tidak ditemukan"), barisnya kelebihan lebar dan
  // `flex-wrap` menurunkannya ke baris kedua. Baris kedua tak punya tempat sama
  // sekali: navbar bertinggi mati `h-16` (64 px) sementara kolom emailnya
  // sendiri sudah 56 px (`p-md` 16 px x2 + tinggi baris ~24 px). Jadi galatnya
  // tergambar DI LUAR latar navbar, menimpa hero di bawahnya, dan karena navbar
  // `z-50` ia menang gambar.
  //
  // `flex-wrap` tetap DIPERTAHANKAN, dan itu disengaja. Komponen ini juga
  // dipakai di drawer mobile (Navbar.jsx), dan di sana barisnya memang tak muat:
  // kolomnya `w-56` (224 px) sementara drawer di layar 390 px cuma menyisakan
  // ~342 px setelah `px-6`. Tanpa pembungkusan, tombolnya yang menjebol ke
  // samping dan halaman jadi bisa digeser horizontal. Yang harus keluar dari
  // baris ini cuma GALATNYA, bukan kemampuan barisnya membungkus.
  return (
    <form onSubmit={handleSubmit} className="relative flex flex-wrap items-center gap-2">
      <Input
        type="text"
        placeholder="Email akun (dev-login)"
        value={identifier}
        onChange={(e) => setIdentifier(e.target.value)}
        className="w-56"
        required
        // Galatnya bukan cuma diwarnai merah: kolomnya ditandai tak sah dan
        // ditautkan ke pesannya, supaya pembaca layar menyebut sebabnya saat
        // fokus kembali ke kolom itu -- bukan cuma "kotak isian, wajib".
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? ID_GALAT : undefined}
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
      {error && (
        // `absolute` = keluar dari alur baris navbar. Ini inti perbaikannya:
        // elemen di luar alur tak bisa lagi menjadi baris kedua yang menjebol
        // tinggi navbar, sepanjang apa pun pesannya.
        //
        // `right-0` (bukan `left-0`): form ini duduk di ujung kanan navbar, jadi
        // menjangkarkannya ke kanan menahannya tetap di dalam layar.
        //
        // Lebarnya PASTI (`w-[min(20rem,...)]`), bukan menyusut-ke-isi, dan
        // JANGAN diganti `max-w-xs`. Repo ini mendaftarkan `--spacing-xs: 4px`
        // di `@theme` (globals.css), dan pada Tailwind v4 skala spacing itulah
        // yang dipakai utilitas `max-w-<nama>` -- jadi `max-w-xs` di sini
        // bernilai 4 px, bukan 20 rem. Terukur: kartunya runtuh jadi 26 px dan
        // pesannya tercetak satu huruf per baris. Sebelumnya dicoba `w-max`, dan
        // itu gagal ke arah sebaliknya: `width: max-content` ditetapkan SEBELUM
        // `max-width` membatasinya, sehingga `<p>`-nya terbentang ~500 px dan
        // menjebol 42 px ke luar layar pada 1440 px (terbukti lewat kontrol:
        // geser horizontal itu tak ada saat form tertutup MAUPUN terbuka tanpa
        // galat). Lebar pasti menutup kedua arah sekaligus.
        //
        // Bagian `calc(100vw-3rem)` menjaga kartunya tetap muat di drawer mobile
        // 390 px; `min-w-0` + `break-words` pada `<p>`-nya kini aman justru
        // KARENA lebar kartunya pasti -- tugasnya cuma memecah alamat email
        // panjang yang satu token tak terpotong.
        //
        // role="alert" -- galat kiriman form harus terdengar, bukan hanya
        // terlihat. Tak dipasangi `aria-live` lagi: role ini sudah bermakna
        // assertive, dan menambahkan `polite` justru saling membatalkan.
        <div
          id={ID_GALAT}
          role="alert"
          className="absolute top-full right-0 z-10 mt-2 flex w-[min(20rem,calc(100vw-3rem))] items-start gap-2 rounded-xl border border-error/30 bg-error-container p-3 text-left text-on-error-container shadow-md"
        >
          <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
          <p className="min-w-0 break-words text-xs font-medium">{error}</p>
        </div>
      )}
    </form>
  );
}
