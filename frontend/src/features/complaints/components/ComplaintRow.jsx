import React from 'react';
import Link from 'next/link';
import { Tr, Td } from '@/components/ui/Table';

export default function ComplaintRow({ id, date, department, title, status }) {
  const statusStyles = {
    'Selesai': 'bg-emerald-100 text-emerald-700',
    'Diproses': 'bg-blue-100 text-blue-700',
    'Diterima': 'bg-slate-100 text-slate-600',
  };

  const currentStyle = statusStyles[status] || 'bg-surface-container-high text-text-primary';

  return (
    <Tr className="group hover:bg-surface-container-low transition-colors">
      <Td className="font-medium text-primary font-bold">{id}</Td>
      <Td className="text-on-surface">{date}</Td>
      <Td className="text-on-surface">{department}</Td>
      <Td className="text-on-surface max-w-xs truncate" title={title}>{title}</Td>
      <Td>
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${currentStyle}`}>
          {status}
        </span>
      </Td>
      <Td className="text-right">
        <Link href={`/complaints/${id.toLowerCase().replace('#', '')}`} className="text-primary font-medium hover:underline transition-all">
          Lihat Detail
        </Link>
      </Td>
    </Tr>
  );
}
