import React from 'react';
import { Edit3, FileSpreadsheet } from 'lucide-react';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';

export default function ActivityHistoryTable() {
  return (
    <section className="space-y-4 pb-8">
      <h2 className="text-xl font-semibold text-text-primary">Riwayat Aktivitas</h2>
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
            <Tr>
              <Td>
                <div className="flex items-center gap-4">
                  <Edit3 className="text-primary" size={24} />
                  <div>
                    <div className="font-bold text-text-primary">Mengajukan Pengaduan #TKT-04</div>
                    <div className="text-xs text-text-secondary">Dinas Lingkungan Hidup</div>
                  </div>
                </div>
              </Td>
              <Td>
                <Badge variant="success">Selesai</Badge>
              </Td>
              <Td className="text-sm text-text-secondary">15 Juli 2026</Td>
            </Tr>
            <Tr>
              <Td>
                <div className="flex items-center gap-4">
                  <FileSpreadsheet className="text-primary" size={24} />
                  <div>
                    <div className="font-bold text-text-primary">Mengisi Survei Dinas Kesehatan</div>
                    <div className="text-xs text-text-secondary">Survei Fasilitas Puskesmas</div>
                  </div>
                </div>
              </Td>
              <Td>
                <Badge variant="info">Disubmit</Badge>
              </Td>
              <Td className="text-sm text-text-secondary">10 Juli 2026</Td>
            </Tr>
          </Tbody>
        </Table>
      </Card>
    </section>
  );
}
