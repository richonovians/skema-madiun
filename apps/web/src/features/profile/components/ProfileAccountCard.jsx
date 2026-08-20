'use client';

import React from 'react';
import { Tag, CalendarDays, History } from 'lucide-react';
import Card from '@/components/ui/Card';

export default function ProfileAccountCard({ user }) {
  const accountItems = [
    {
      label: 'ID Responden',
      value: user.id,
      icon: Tag,
      highlight: true,
    },
    {
      label: 'Tanggal Bergabung',
      value: user.joinedAt,
      icon: CalendarDays,
    },
    {
      label: 'Login Terakhir',
      value: user.lastLogin,
      icon: History,
    },
  ];

  return (
    <Card className="p-5 sm:p-6 md:p-8 space-y-5 sm:space-y-6 transition-all duration-300 hover:shadow-md">
      <div className="border-b border-border pb-4">
        <h2 className="text-lg font-bold text-text-primary">Informasi Akun</h2>
        <p className="text-sm text-text-secondary">
          Metadata keanggotaan dan riwayat akses akun pada sistem SKEMA Madiun.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 pt-2">
        {accountItems.map((item, index) => {
          const IconComponent = item.icon;
          return (
            <div 
              key={index} 
              className={`p-4 rounded-xl border transition-colors ${
                item.highlight 
                  ? 'bg-primary-container/20 border-primary/30 text-primary' 
                  : 'bg-surface-container-low/50 border-border/40 text-text-primary hover:bg-surface-container-low'
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                <IconComponent size={15} className="text-primary shrink-0" />
                <span>{item.label}</span>
              </div>
              <div className="text-base font-bold font-mono tracking-wide">
                {item.value || '-'}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
