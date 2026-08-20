'use client';

import React, { useState } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { authApi } from '../services/sso.api';
import { saveSession, clearSession } from '../services/authStorage';
import { ROLE_HOME } from '@/constants/roleHome';
import RoleLoginPicker from './RoleLoginPicker';

// Sementara: form dev-login (identifier = email/ssoSubject akun seed) menggantikan
// tombol SSO Helpdesk sungguhan yang menunggu spesifikasi OAuth dari Helpdesk (SSO-1).
export default function SSOLoginButton() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // Terisi HANYA bila yang login berperan `superuser` -- memicu pemilih peran.
  // Peran lain (termasuk Admin Kabupaten) tak pernah melewati jalur ini. Objek
  // (bukan string) supaya nama yang kosong tak salah dibaca sebagai "tak ada
  // pemilih".
  const [rolePicker, setRolePicker] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const res = await authApi.devLogin(identifier);
      const role = res.data.user?.role;
      saveSession(res.data.token, role);

      // HANYA `superuser` yang boleh memilih peran (2026-08-20). Admin
      // Kabupaten TIDAK: ia langsung ke /admin-kab/dashboard lewat ROLE_HOME di
      // bawah, sama seperti Admin OPD dan Warga. Sesi superuser sendiri yang
      // terus dipakai -- pemilihnya cuma menentukan area mana yang dibuka, tak
      // ada login ulang dan tak ada akun lain yang dipinjam.
      if (role === 'superuser') {
        setRolePicker({ name: res.data.user?.nama ?? '' });
        return; // `finally` di bawah tetap mematikan status memuat
      }

      // SEBELUMNYA cuma reload halaman saat ini (biasanya beranda publik) --
      // admin harus navigasi manual sendiri ke /admin-kab atau /admin-opd
      // (2026-08-06, laporan bug user). `window.location.href` (bukan
      // router.push) SENGAJA -- proxy.js baca cookie via full request,
      // butuh navigasi hard agar cookie `role` yang baru saja ditulis
      // langsung terbaca proxy pada request berikutnya.
      window.location.href = ROLE_HOME[role] ?? '/';
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
    return <RoleLoginPicker superuserName={rolePicker.name} onCancel={handleCancelRolePicker} />;
  }

  if (!isFormOpen) {
    return (
      <Button variant="navLogin" onClick={() => setIsFormOpen(true)}>
        Masuk via SSO Helpdesk
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
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
      {error && <span className="text-xs text-red-600">{error}</span>}
    </form>
  );
}
