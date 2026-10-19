import React from 'react';
import Card from '@/components/ui/Card';
import { Table, Thead, Tbody, Tr, Th } from '@/components/ui/Table';
import Pagination from '@/components/ui/Pagination';
import CatatanPemotongan from '@/components/ui/CatatanPemotongan';
import ComplaintRow from './ComplaintRow';

/**
 * @param {object[]} complaints Baris yang BENAR-BENAR dirender; tabel ini tak
 *   memotong apa pun sendiri.
 * @param {number} [totalAll] `meta.pagination.total` dari backend. Halamannya
 *   mengambil 50 baris, jadi inilah satu-satunya cara mengetahui ada sisa.
 *
 * KENDALI PAGINASINYA DULU BERDUSTA (15 Oktober 2026): `totalPages`,
 * `currentPage`, dan `itemsPerPage` dipatok mati `1/1/3`, sehingga footer
 * berbunyi "Menampilkan 1-3 dari 12" di bawah tabel berisi dua belas baris,
 * dengan kedua panah mati. Angkanya kini diturunkan dari baris yang ada:
 * tabel ini memang satu halaman, dan footernya mengatakan begitu.
 */
export default function ComplaintTable({ complaints = [], totalAll = 0 }) {
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
      <Pagination
        totalItems={complaints.length}
        totalPages={1}
        currentPage={1}
        itemsPerPage={complaints.length || 1}
      />
      {totalAll > complaints.length && (
        <div className="px-6 pb-4 bg-surface-container-low">
          <CatatanPemotongan
            ditampilkan={complaints.length}
            total={totalAll}
            namaItem="pengaduan"
          />
        </div>
      )}
    </Card>
  );
}
