'use client';

import React, { useCallback, useMemo } from 'react';
import { Edit3, FileSpreadsheet, History } from 'lucide-react';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import EmptyState from '@/components/ui/EmptyState';
import { useAsync } from '@/hooks/useAsync';
import { getComplaints } from '@/features/complaints/services/complaints.api';
import { getMySurveyResponses } from '@/features/surveys/services/surveys.api';
import { formatDateId } from '@/utils/format';

const STATUS_VARIANT = {
  Diterima: 'info',
  Diproses: 'secondary',
  Selesai: 'success',
  Ditolak: 'error',
  // Status semu untuk baris pengisian survei (lihat `surveyRows` di bawah).
  Terkirim: 'success',
};

// Baris yang ditampilkan setelah kedua sumber digabung. Masing-masing sumber
// diambil sebanyak ini juga: untuk mendapat N teratas dari gabungan, tiap sumber
// harus menyumbang hingga N calon (kalau salah satu hanya diambil 5 sedangkan
// yang lain 10, urutan gabungannya bisa keliru).
const MAX_ROWS = 10;

/**
 * Riwayat aktivitas di dashboard warga -- sebelumnya 100% hardcoded (2 baris
 * dengan tiket/tanggal palsu), lalu diisi pengaduan sungguhan.
 *
 * PENGISIAN SURVEI kini ikut tercatat (2026-08-24, permintaan user). Komentar lama
 * di berkas ini menyatakan hal itu MUSTAHIL karena "ResponseEntity backend sengaja
 * anonim (tanpa userId)" -- itu sudah TIDAK berlaku: `SurveyResponse.userId` adalah
 * kolom wajib (warisan fitur anti-duplikat, lihat schema.prisma), jadi respons
 * memang bisa ditelusuri ke pengisinya. Yang tetap berlaku adalah admin tak boleh
 * tahu siapa pengisi sebuah respons; di sini warga melihat catatannya SENDIRI
 * lewat GET /me/survey-responses yang selalu disaring token pemanggil.
 */
export default function ActivityHistoryTable() {
  const fetchActivities = useCallback(async () => {
    const [complaints, surveyResponses] = await Promise.all([
      getComplaints({ page: 1, limit: MAX_ROWS }),
      getMySurveyResponses({ page: 1, limit: MAX_ROWS }),
    ]);
    return { complaints: complaints.data ?? [], surveyResponses: surveyResponses.data ?? [] };
  }, []);

  const { data, isLoading, error } = useAsync(fetchActivities);

  const activities = useMemo(() => {
    if (!data) return [];

    // `key` WAJIB berprefiks: id pengaduan & id respons survei berasal dari dua
    // tabel berbeda, jadi angkanya bisa sama dan React key-nya bertabrakan.
    const complaintRows = data.complaints.map((complaint) => ({
      key: `complaint-${complaint.id}`,
      icon: Edit3,
      label: `Mengajukan Pengaduan #${complaint.id}`,
      sublabel: complaint.target ?? 'Instansi terkait',
      status: complaint.status,
      at: complaint.createdAt,
    }));

    const surveyRows = data.surveyResponses.map((response) => ({
      key: `survey-${response.id}`,
      icon: FileSpreadsheet,
      label: `Mengisi Survei "${response.title}"`,
      sublabel: [response.opd, response.period].filter(Boolean).join(' · ') || 'Instansi terkait',
      // Respons survei tak punya alur status seperti pengaduan -- begitu terkirim
      // ia final. Ditandai "Terkirim" alih-alih dikosongkan, supaya kolom Status
      // tak berlubang di sebagian baris.
      status: 'Terkirim',
      at: response.submittedAt,
    }));

    // Diurutkan dari tanggal MENTAH, bukan hasil formatDateId -- string "25
    // Agustus 2026" tak bisa diurutkan secara leksikografis.
    return [...complaintRows, ...surveyRows]
      .sort((a, b) => new Date(b.at) - new Date(a.at))
      .slice(0, MAX_ROWS);
  }, [data]);

  return (
    <section className="space-y-4 pb-8">
      <h2 className="text-xl font-semibold text-text-primary">Riwayat Aktivitas</h2>

      {isLoading && <LoadingState label="Memuat riwayat aktivitas..." />}

      {error && <ErrorState title="Gagal memuat riwayat" description={error.message} />}

      {!isLoading && !error && activities.length === 0 && (
        <EmptyState
          icon={<History size={48} />}
          title="Belum ada aktivitas"
          description="Pengaduan yang Anda ajukan dan survei yang Anda isi akan muncul di sini."
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
                  <Tr key={activity.key}>
                    <Td>
                      <div className="flex items-center gap-4">
                        <IconComponent className="text-primary shrink-0" size={24} />
                        <div className="min-w-0">
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
                    <Td className="text-sm text-text-secondary">{formatDateId(activity.at)}</Td>
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
