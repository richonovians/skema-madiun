'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import Button from '@/components/ui/Button';

export default function ProfileActions() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = () => {
    setIsLoggingOut(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sso_logged_in', 'false');
    }
    // Simulasi proses logout sederhana, kemudian arahkan kembali ke Landing Page (Beranda)
    setTimeout(() => {
      router.push('/');
    }, 500);
  };

  return (
    <div className="flex justify-end pt-2">
      <Button 
        variant="danger" 
        onClick={handleLogout}
        disabled={isLoggingOut}
        className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-bold transition-all shadow-sm hover:shadow-md"
      >
        <LogOut size={18} />
        <span>{isLoggingOut ? 'Keluar...' : 'Logout'}</span>
      </Button>
    </div>
  );
}
