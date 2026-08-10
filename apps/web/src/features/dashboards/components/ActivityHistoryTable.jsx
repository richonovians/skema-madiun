'use client';

import React, { useCallback, useMemo } from 'react';
import { Edit3, FileSpreadsheet, Eye, History } from 'lucide-react';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import EmptyState from '@/components/ui/EmptyState';
import { useAsync } from '@/hooks/useAsync';
import { getComplaints } from '@/features/complaints/services/complaints.api';
import { formatDateId } from '@/utils/format';

const STATUS_VARIANT = {
  Diterima: 'info',
  Diproses: 'secondary',
  Selesai: 'success',
  Ditolak: 'error',
};

/**
 * Riwayat aktivitas di dashboard warga -- sebelumnya 100% hardcoded (2 baris
 * dengan tiket/tanggal palsu). Kini fetch GET /complaints?page=1&limit=5
 * dan tampilkan sebagai riwayat aktivitas pengguna.
 *
 * CATATAN: Backend tidak punya endpoint gabungan "riwayat aktivitas responden".
 * Saat ini hanya menampilkan pengaduan (sumber data yang paling bermakna bagi
 * warga). Data survei yang telah diisi TIDAK bisa ditampilkan karena
 * ResponseEntity backend sengaja anonim (tanpa userId) -- tak ada cara
 * mengetahui survei mana yang telah diisi user tertentu.
 */
export default function ActivityHistoryTable() {
  const fetchComplaints = useCallback(() => getComplaints({ page: 1, limit: 5 }), []);
  const { data: response, isLoading, error } = useAsync(fetchComplaints);

  const activities = useMemo(() => {
    if (!response?.data) return [];
    return response.data.map((complaint) => ({
      id: complaint.id,
      icon: Edit3,
      label: `Mengajukan Pengaduan #${complaint.id}`,
      sublabel: complaint.target ?? 'Instansi terkait',
      status: complaint.status,
      date: formatDateId(complaint.createdAt),
      href: `/complaints/${complaint.id}`,
    }));
  }, [response]);

  return (
    <section className="space-y-4 pb-8">
      <h2 className="text-xl font-semibold text-text-primary">Riwayat Aktivitas</h2>

      {isLoading && <LoadingState label="Memuat riwayat aktivitas..." />}

      {error && <ErrorState title="Gagal memuat riwayat" description={error.message} />}

      {!isLoading && !error && activities.length === 0 && (
        <EmptyState
          icon={<History size={48} />}
          title="Belum ada aktivitas"
          description="Riwayat pengaduan dan aktivitas Anda akan muncul di sini."
        />
      )}

      {!isLoading && !error && activities.length > 0 && (
        <Card className="overflow-hidden">
          <Table>
            <Thead>
              <Tr>
                <Th>Aktivitas</Th>
                <Th>Status</Th>
                <Th>Tanggal</Th>
              </Tr>
            </Thead>
            <Tbody>
              {activities.map((activity) => {
                const IconComponent = activity.icon;
                return (
                  <Tr key={activity.id}>
                    <Td>
                      <div className="flex items-center gap-4">
                        <IconComponent className="text-primary" size={24} />
                        <div>
                          <div className="font-bold text-text-primary">{activity.label}</div>
                          <div className="text-xs text-text-secondary">{activity.sublabel}</div>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <Badge variant={STATUS_VARIANT[activity.status] ?? 'secondary'}>
                        {activity.status}
                      </Badge>
                    </Td>
                    <Td className="text-sm text-text-secondary">{activity.date}</Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        </Card>
      )}
    </section>
  );
}

