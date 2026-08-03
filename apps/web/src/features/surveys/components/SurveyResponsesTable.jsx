import React from 'react';
import Link from 'next/link';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import { Eye } from 'lucide-react';

export default function SurveyResponsesTable({ surveyId, responses }) {
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-surface rounded-xl border border-outline-variant overflow-hidden">
      <Table>
        <Thead>
          <Tr>
            <Th>Responden</Th>
            <Th>Email</Th>
            <Th>No. Telepon</Th>
            <Th>Waktu Pengisian</Th>
            <Th>Nilai</Th>
            <Th><span className="sr-only">Aksi</span></Th>
          </Tr>
        </Thead>
        <Tbody>
          {responses.map((response) => (
            <Tr key={response.id}>
              <Td>
                <div className="flex items-center gap-sm">
                  <Avatar name={response.respondent.name} size="sm" />
                  <span className="font-medium text-on-surface">{response.respondent.name}</span>
                </div>
              </Td>
              <Td>
                <span className="text-on-surface-variant">{response.respondent.email || '-'}</span>
              </Td>
              <Td>
                <span className="text-on-surface-variant">{response.respondent.phone || '-'}</span>
              </Td>
              <Td>
                <span className="text-on-surface-variant">{formatDate(response.submittedAt)}</span>
              </Td>
              <Td>
                <span className="font-bold text-on-surface">
                  {response.score?.toFixed(1) || '-'}
                </span>
              </Td>
              <Td>
                <Link href={`/admin-opd/surveys/${surveyId}/responses/${response.id}`}>
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
              <Td colSpan={6} className="text-center py-xl text-on-surface-variant">
                Belum ada respons untuk survei ini.
              </Td>
            </Tr>
          )}
        </Tbody>
      </Table>
    </div>
  );
}
