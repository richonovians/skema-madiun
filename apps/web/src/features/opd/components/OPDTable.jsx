import React, { useState, useRef, useEffect } from 'react';
import Badge from '@/components/ui/Badge';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/Table';
import { ChevronDown } from 'lucide-react';

const ActionMenu = ({ item, onUpdateStatus }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button 
        className="flex items-center gap-1 text-primary hover:underline font-semibold text-sm"
        onClick={() => setIsOpen(!isOpen)}
      >
        Edit
        <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-border overflow-hidden z-50">
          <ul className="py-1">
            <li>
              {item.status === 'ACTIVE' ? (
                <button 
                  className="w-full text-left px-4 py-2 text-sm hover:bg-surface-container"
                  onClick={() => {
                    onUpdateStatus?.(item.id, 'INACTIVE');
                    setIsOpen(false);
                  }}
                >
                  Nonaktifkan
                </button>
              ) : (
                <button 
                  className="w-full text-left px-4 py-2 text-sm hover:bg-surface-container"
                  onClick={() => {
                    onUpdateStatus?.(item.id, 'ACTIVE');
                    setIsOpen(false);
                  }}
                >
                  Aktifkan
                </button>
              )}
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default function OPDTable({ data, onUpdateStatus, pagination }) {
  
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
                <ActionMenu item={item} onUpdateStatus={onUpdateStatus} />
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
