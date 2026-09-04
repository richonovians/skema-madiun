import React from 'react';
import Card from '@/components/ui/Card';
import { Table, Thead, Tbody, Tr, Th } from '@/components/ui/Table';
import Pagination from '@/components/ui/Pagination';
import ComplaintRow from './ComplaintRow';

export default function ComplaintTable({ complaints = [] }) {
  return (
    <Card className="overflow-hidden border border-border shadow-sm">
      <Table>
        <Thead>
          <Tr className="bg-surface-container">
            <Th className="text-on-surface-variant whitespace-nowrap">ID TIKET</Th>
            <Th className="text-on-surface-variant whitespace-nowrap">TANGGAL</Th>
            <Th className="text-on-surface-variant whitespace-nowrap">OPD TUJUAN</Th>
            <Th className="text-on-surface-variant whitespace-nowrap">JUDUL PENGADUAN</Th>
            <Th className="text-on-surface-variant whitespace-nowrap">STATUS</Th>
            <Th className="text-on-surface-variant whitespace-nowrap text-right">AKSI</Th>
          </Tr>
        </Thead>
        <Tbody>
          {complaints.map((item, index) => (
            <ComplaintRow 
              key={index}
              id={item.id}
              date={item.date}
              department={item.department}
              title={item.title}
              status={item.status}
              isAnonim={item.isAnonim}
            />
          ))}
        </Tbody>
      </Table>
      <Pagination totalItems={complaints.length} totalPages={1} currentPage={1} itemsPerPage={3} />
    </Card>
  );
}
