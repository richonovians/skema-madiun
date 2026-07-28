import React from 'react';
import Badge from '@/components/ui/Badge';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/Table';

export default function OPDTable({ data }) {
  
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
      <Table>
        <Thead>
          <Tr className="bg-[#F8FAFC]">
            <Th>KODE OPD</Th>
            <Th>NAMA INSTANSI</Th>
            <Th>JENIS LAYANAN</Th>
            <Th>AKTIVITAS SISTEM</Th>
            <Th>STATUS</Th>
            <Th>TINDAKAN</Th>
          </Tr>
        </Thead>
        <Tbody>
          {data.map((item) => (
            <Tr key={item.id}>
              <Td className="whitespace-nowrap font-mono text-primary font-medium">
                {item.code}
              </Td>
              <Td>
                <div className="font-bold text-text-primary">{item.name}</div>
                <div className="text-xs text-text-secondary">{item.address}</div>
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
              <Td>
                <div className="flex items-center gap-4 font-semibold text-sm">
                  <button 
                    className="text-primary hover:underline"
                    onClick={() => console.log('Edit clicked for', item.id)}
                  >
                    Edit
                  </button>
                  {item.status === 'ACTIVE' ? (
                    <button 
                      className="text-error hover:underline"
                      onClick={() => console.log('Nonaktifkan clicked for', item.id)}
                    >
                      Nonaktifkan
                    </button>
                  ) : (
                    <button 
                      className="text-green-600 hover:underline"
                      onClick={() => console.log('Aktifkan clicked for', item.id)}
                    >
                      Aktifkan
                    </button>
                  )}
                </div>
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
  );
}
