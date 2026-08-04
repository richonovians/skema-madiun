'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import Button from '@/components/ui/Button';
import { authApi } from '@/features/authentication/services/sso.api';
import { clearSession } from '@/features/authentication/services/authStorage';

export default function ProfileActions() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await authApi.logout();
    } catch {
      // Logout stateless di backend — tetap hapus sesi lokal walau request gagal.
    }
    clearSession();
    router.push('/');
  };

  return (
    <div className="flex justify-end pt-2">
      <Button 
        variant="danger" 
        onClick={handleLogout}
        disabled={isLoggingOut}
        className="w-full sm:w-auto min-h-[48px] flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-bold transition-all shadow-sm hover:shadow-md"
      >
        <LogOut size={18} />
        <span>{isLoggingOut ? 'Keluar...' : 'Logout'}</span>
      </Button>
    </div>
  );
}
