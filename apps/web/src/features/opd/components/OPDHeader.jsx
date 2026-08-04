import React from 'react';
import { RefreshCw } from 'lucide-react';
import Button from '@/components/ui/Button';

/**
 * D10 (docs/Rencana-Integrasi-Frontend-Backend.md): OPD adalah cache read-only
 * dari Helpdesk -- backend TAK PERNAH sediakan create/update manual (cuma
 * `GET /opd` & `POST /opd/sync`), jadi "Tambah Instansi OPD Baru" (versi dummy
 * lama, tanpa handler apa pun) diganti "Sinkronkan dari Helpdesk" yang
 * memanggil sinkronisasi sungguhan.
 */
export default function OPDHeader({ onSync, isSyncing }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-end mb-xl gap-4">
      <Button
        variant="primary-box"
        className="shadow-primary-container/20 px-6 py-3 disabled:opacity-60 disabled:cursor-not-allowed"
        onClick={onSync}
        disabled={isSyncing}
      >
        <RefreshCw size={20} className={isSyncing ? 'animate-spin' : ''} />
        <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan dari Helpdesk'}</span>
      </Button>
    </div>
  );
}
