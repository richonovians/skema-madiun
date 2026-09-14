import React from 'react';
import { UserPlus } from 'lucide-react';
import clsx from 'clsx';

/**
 * Tautan pendaftaran akun Helpdesk (14 September 2026, permintaan pengguna).
 *
 * Pendaftaran TIDAK terjadi di aplikasi ini. Akun SKEMA lahir di Helpdesk
 * Kabupaten Madiun lalu masuk ke sini lewat SSO, jadi yang dapat ditawarkan
 * halaman ini hanyalah jalan ke sana. Menempatkannya di navbar berarti
 * pengunjung yang belum punya akun tak perlu menebak-nebak harus ke mana.
 *
 * `rel="noopener"` bukan formalitas: tanpa itu halaman tujuan memegang
 * `window.opener` dan dapat mengalihkan tab asal ke alamat lain.
 */
export const ALAMAT_REGISTRASI_HELPDESK = 'https://helpdesk.madiunkab.go.id/register';

export default function RegistrasiHelpdeskLink({ className = '' }) {
  return (
    <a
      href={ALAMAT_REGISTRASI_HELPDESK}
      target="_blank"
      rel="noopener noreferrer"
      className={clsx(
        'inline-flex items-center justify-center gap-2 whitespace-nowrap',
        'rounded-full bg-slate-900 px-5 py-2.5 text-sm font-bold text-white',
        'shadow-sm transition-all duration-300',
        'hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md active:scale-[0.98]',
        'focus:outline-none focus:ring-2 focus:ring-slate-900/25',
        className,
      )}
    >
      Registrasi Helpdesk
      <UserPlus size={16} aria-hidden="true" />
    </a>
  );
}
