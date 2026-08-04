import React from 'react';
import Badge from '@/components/ui/Badge';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/Table';
import { formatDateId } from '@/utils/format';

/**
 * `TINDAKAN` (menu Aktifkan/Nonaktifkan) DIHAPUS -- backend TAK PUNYA endpoint
 * mutasi status OPD sama sekali (cuma `GET /opd` & `POST /opd/sync`, lihat D10).
 * Isian sebelumnya 100% dummy, tak pernah terhubung apa pun. Diganti kolom
 * `TERAKHIR DISINKRON` (`syncedAt`, field asli yg sebelumnya tak ditampilkan
 * sama sekali) -- info nyata yg berguna menggantikan aksi karangan.
 */
export default function OPDTable({ data, pagination }) {
  const getStatusVariant = (status) => {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'INACTIVE':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'ACTIVE':
        return 'Aktif';
      case 'INACTIVE':
        return 'Nonaktif';
      default:
        return status;
    }
  };

  return (
    <div className="bg-surface rounded-xl shadow-sm border border-border overflow-hidden">
      <div className="w-full overflow-x-auto min-h-[250px]">
        <Table>
          <Thead>
          <Tr className="bg-[#F8FAFC]">
            <Th>KODE OPD</Th>
            <Th>NAMA INSTANSI</Th>
            <Th>JENIS LAYANAN</Th>
            <Th>AKTIVITAS SISTEM</Th>
            <Th>STATUS</Th>
            <Th>TERAKHIR DISINKRON</Th>
          </Tr>
        </Thead>
        <Tbody>
          {data.map((item) => (
            <Tr key={item.id}>
              <Td className="whitespace-nowrap font-mono text-primary font-medium">
                {item.code}
              </Td>
              <Td>
                {/* Alamat DIHAPUS dari tampilan (bukan disembunyikan diam-diam)
                    -- backend tak punya kolom ini, OPD cache read-only dari
                    Helpdesk (D7): menambah kolom lokal berarti data itu tak
                    akan pernah tersinkronisasi. */}
                <div className="font-bold text-text-primary">{item.name}</div>
              </Td>
              <Td className="text-on-surface-variant font-body-md text-body-md">
                {item.serviceType}
              </Td>
              <Td>
                <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                  <span className={`flex items-center gap-1 font-semibold ${item.activeSurveys > 0 ? 'text-primary' : 'text-outline'}`}>
                    <span className={`w-2 h-2 rounded-full ${item.activeSurveys > 0 ? 'bg-primary' : 'bg-outline'}`}></span>
                    {item.activeSurveys} Survei Aktif
                  </span>
                  <span className="text-border">|</span>
                  <span className={`flex items-center gap-1 font-semibold ${item.openComplaints > 0 ? 'text-tertiary' : 'text-outline'}`}>
                    {item.openComplaints} Pengaduan Terbuka
                  </span>
                </div>
              </Td>
              <Td>
                <Badge variant={getStatusVariant(item.status)}>
                  {getStatusLabel(item.status)}
                </Badge>
              </Td>
              <Td className="text-on-surface-variant font-body-md text-body-md whitespace-nowrap">
                {item.syncedAt ? formatDateId(item.syncedAt) : 'Belum pernah'}
              </Td>
            </Tr>
          ))}
          {data.length === 0 && (
            <Tr>
              <Td colSpan={6} className="text-center py-8 text-text-secondary">
                Tidak ada data OPD yang ditemukan.
              </Td>
            </Tr>
          )}
          </Tbody>
        </Table>
      </div>
      {pagination}
    </div>
  );
}
