import React from 'react';
import Link from 'next/link';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import { Eye } from 'lucide-react';

/**
 * Kolom Responden/Email/No. Telepon DIHAPUS -- SKM sengaja anonim by design
 * (ResponseEntity backend TAK memuat identitas pengisi sama sekali, lihat
 * catatan di response.entity.ts & survey.adapter.js). "Nilai" sekarang
 * `averageScore` DIDERIVASI dari jawaban skala respons itu sendiri (bukan
 * field backend).
 *
 * `basePath` (2026-08-19): akar area ('/admin-opd/surveys' | '/admin-kab/surveys').
 * Sebelumnya '/admin-opd' tertanam keras di tautan Detail, sehingga tabel ini tak
 * bisa dipakai Admin Kabupaten tanpa memindahkannya ke area peran lain.
 */
export default function SurveyResponsesTable({ surveyId, responses, basePath }) {
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-surface rounded-xl border border-outline-variant overflow-hidden">
      <Table>
        <Thead>
          <Tr>
            <Th>Respons</Th>
            <Th>Waktu Pengisian</Th>
            <Th>Nilai Rata-Rata</Th>
            <Th>
              <span className="sr-only">Aksi</span>
            </Th>
          </Tr>
        </Thead>
        <Tbody>
          {responses.map((response, index) => (
            <Tr key={response.id}>
              <Td>
                <span className="font-medium text-on-surface">Respons #{index + 1}</span>
              </Td>
              <Td>
                <span className="text-on-surface-variant">{formatDate(response.submittedAt)}</span>
              </Td>
              <Td>
                <span className="font-bold text-on-surface">
                  {response.averageScore != null ? `${response.averageScore.toFixed(1)} / 4` : '-'}
                </span>
              </Td>
              <Td>
                <Link href={`${basePath}/${surveyId}/responses/${response.id}`}>
                  <Button variant="secondary">
                    <Eye size={16} />
                    Detail
                  </Button>
                </Link>
              </Td>
            </Tr>
          ))}
          {responses.length === 0 && (
            <Tr>
              <Td colSpan={4} className="text-center py-xl text-on-surface-variant">
                Belum ada respons untuk survei ini.
              </Td>
            </Tr>
          )}
        </Tbody>
      </Table>
    </div>
  );
}
