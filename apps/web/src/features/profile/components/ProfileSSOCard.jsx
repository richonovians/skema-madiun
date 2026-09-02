'use client';

import React from 'react';
import { ShieldCheck, CheckCircle2, Building2, RefreshCw, Info, ExternalLink, Fingerprint } from 'lucide-react';
import Card from '@/components/ui/Card';

/**
 * Kartu koneksi SSO.
 *
 * Isinya DITURUNKAN dari `sso` hasil adapter, tak pernah mengarang: dulu
 * `providerName` yang null diganti teks penyedia di sini -- fiksi yang sudah
 * sengaja ditolak me.adapter.js.
 *
 * Sejak 2026-08-27 modul SSO Helpdesk sudah ada, dan yang menentukan tersambung
 * atau tidak adalah `me.ssoLinked` dari backend (lihat me.adapter.js). Jadi
 * kartu ini kini menampilkan keadaan SEBENARNYA pada kedua arah: nama penyedia
 * & tautan portal untuk akun yang sungguh lewat Helpdesk, "belum tersambung"
 * untuk yang masih memakai dev-login.
 *
 * `accountId` (dari `ssoSubject`) selalu ditampilkan karena selalu terisi --
 * berisi `sub` asli Helpdesk bila tertaut, atau nilai penampung bila belum.
 */
export default function ProfileSSOCard({ user }) {
  const sso = user?.sso;
  const isSsoConnected = Boolean(sso?.providerName);

  return (
    <Card className="p-5 sm:p-6 md:p-8 space-y-5 sm:space-y-6 transition-all duration-300 hover:shadow-md">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-primary-container/30 text-primary">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-text-primary">Koneksi SSO</h2>
            <p className="text-sm text-text-secondary">
              Otentikasi terpusat Pemerintah Kabupaten Madiun.
            </p>
          </div>
        </div>
      </div>

      {/* Information Banner */}
      <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-800/40 flex items-start gap-3.5 text-blue-900 dark:text-blue-200">
        <Info size={18} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs sm:text-sm">
          <p className="font-semibold text-blue-950 dark:text-blue-100">
            Manajemen Identitas Terpadu
          </p>
          {/* Teks "belum tersambung" diperbaiki 2026-08-27: dulu berbunyi
              "integrasi ... belum aktif", dan itu tak lagi benar — modulnya sudah
              ada. Yang belum tertaut adalah AKUN INI, dan itu keadaan yang
              berbeda serta punya jalan keluar yang jelas. */}
          <p className="leading-relaxed text-blue-800/90 dark:text-blue-200/90">
            {isSsoConnected
              ? 'Informasi akun pada halaman ini dikelola melalui penyedia SSO di atas. Untuk mengubah biodata, gunakan portal SSO resmi.'
              : 'Akun ini belum tertaut ke akun Helpdesk Anda, sehingga biodata belum dapat disinkronkan dari portal SSO. Penautan terjadi otomatis saat Anda pertama kali masuk lewat tombol "Masuk via SSO Helpdesk". Data yang tampil sekarang berasal dari akun yang terdaftar pada sistem SKEMA.'}
          </p>
          {sso?.portalUrl && (
            <div className="pt-1">
              <a 
                href={sso.portalUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="inline-flex items-center gap-1 font-semibold text-blue-700 dark:text-blue-300 hover:underline text-xs"
              >
                <span>Buka Portal SSO Helpdesk</span>
                <ExternalLink size={12} />
              </a>
            </div>
          )}
        </div>
      </div>

      {/* SSO Connection Details List */}
      <div className="space-y-4 pt-1">
        {/* Status sesi -- BUKAN status koneksi SSO. Dibedakan sejak 2026-08-19:
            dulu selalu berbunyi "Terhubung" dengan titik hijau berdenyut, yang
            terbaca sebagai "SSO tersambung" padahal yang aktif cuma sesi lokal. */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface-container-low/60 border border-border/40">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={18} className="text-emerald-500" />
            <span className="text-sm font-semibold text-text-secondary">Sesi</span>
          </div>
          <div className="flex items-center gap-1.5 font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full text-xs border border-emerald-200/60 dark:border-emerald-800/40">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Aktif</span>
          </div>
        </div>

        {/* Penyedia */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface-container-low/60 border border-border/40">
          <div className="flex items-center gap-3">
            <Building2 size={18} className="text-primary" />
            <span className="text-sm font-semibold text-text-secondary">Penyedia SSO</span>
          </div>
          <span
            className={`text-sm font-bold text-right ${isSsoConnected ? 'text-text-primary' : 'text-text-secondary italic'}`}
          >
            {sso?.providerName || 'Belum tersambung'}
          </span>
        </div>

        {/* ID akun pada penyedia -- satu-satunya field SSO yang benar-benar terisi. */}
        {sso?.accountId && (
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface-container-low/60 border border-border/40 gap-3">
            <div className="flex items-center gap-3 shrink-0">
              <Fingerprint size={18} className="text-primary" />
              <span className="text-sm font-semibold text-text-secondary">ID Akun</span>
            </div>
            <span className="text-sm font-bold font-mono text-text-primary text-right break-all">
              {sso.accountId}
            </span>
          </div>
        )}

        {/* Terakhir Sinkronisasi */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface-container-low/60 border border-border/40">
          <div className="flex items-center gap-3">
            <RefreshCw size={18} className="text-primary" />
            <span className="text-sm font-semibold text-text-secondary">Terakhir Sinkronisasi</span>
          </div>
          <span className="text-sm font-bold font-mono text-text-primary text-right">
            {sso?.lastSynced || 'Belum pernah'}
          </span>
        </div>
      </div>
    </Card>
  );
}
