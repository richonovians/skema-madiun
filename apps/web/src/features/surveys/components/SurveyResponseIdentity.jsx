import React from 'react';
import Card from '@/components/ui/Card';
import Avatar from '@/components/ui/Avatar';
import { Mail, Phone, User } from 'lucide-react';

export default function SurveyResponseIdentity({ respondent }) {
  if (!respondent) return null;

  return (
    <Card className="p-lg">
      <h3 className="font-h3 text-h3 text-on-surface mb-md pb-sm border-b border-outline-variant">
        Identitas Responden
      </h3>
      
      <div className="flex flex-col items-center gap-6">
        <Avatar name={respondent.name} size="xl" />
        
        <div className="w-full space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-container-low border border-outline-variant">
            <User size={18} className="text-on-surface-variant shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-on-surface-variant font-medium">Nama Lengkap</p>
              <p className="font-medium text-on-surface text-sm truncate">{respondent.name}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-container-low border border-outline-variant">
            <Mail size={18} className="text-on-surface-variant shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-on-surface-variant font-medium">Email</p>
              <p className="font-medium text-on-surface text-sm break-all">{respondent.email || '-'}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-container-low border border-outline-variant">
            <Phone size={18} className="text-on-surface-variant shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-on-surface-variant font-medium">Nomor Telepon</p>
              <p className="font-medium text-on-surface text-sm truncate">{respondent.phone || '-'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-container-low border border-outline-variant">
            <div className="text-on-surface-variant font-bold px-1 shrink-0 text-sm">ID</div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-on-surface-variant font-medium">ID Responden</p>
              <p className="font-medium text-on-surface text-sm truncate">{respondent.id || '-'}</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
