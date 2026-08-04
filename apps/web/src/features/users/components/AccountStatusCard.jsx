import React from 'react';
import { ToggleRight } from 'lucide-react';
import Card from '@/components/ui/Card';
import Switch from '@/components/ui/Switch';
import Badge from '@/components/ui/Badge';

export default function AccountStatusCard({ isActive, onChange }) {
  return (
    <Card className="p-lg">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-md pb-md border-b border-border">
        <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
          <ToggleRight size={18} className="text-emerald-600" />
        </div>
        <div>
          <h2 className="font-bold text-text-primary text-sm">Status Akun</h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Tentukan apakah akun langsung aktif setelah dibuat
          </p>
        </div>
      </div>

      {/* Toggle Row */}
      <div className="flex items-center justify-between gap-4 p-md bg-surface-container-low rounded-xl border border-outline-variant">
        <div className="flex flex-col gap-1">
          <span className="font-bold text-text-primary text-sm">Status Akun Administrator</span>
          <p className="text-xs text-text-secondary">
            {isActive
              ? 'Akun aktif dan dapat digunakan untuk login.'
              : 'Akun tidak aktif dan tidak dapat digunakan untuk login.'}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <Badge
            variant={isActive ? 'success' : 'default'}
            className="transition-all duration-300"
          >
            {isActive ? 'Aktif' : 'Nonaktif'}
          </Badge>
          <Switch
            checked={isActive}
            onChange={onChange}
            aria-label="Toggle status akun"
          />
        </div>
      </div>
    </Card>
  );
}
