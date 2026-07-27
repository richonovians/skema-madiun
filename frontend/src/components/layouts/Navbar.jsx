'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import SSOLoginButton from '@/features/authentication/components/SSOLoginButton';
import ProfileAvatarDropdown from '@/features/profile/components/ProfileAvatarDropdown';

export default function Navbar() {
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(true);

  useEffect(() => {
    // Cek status login sementara di localStorage untuk keperluan demonstrasi UI
    if (typeof window !== 'undefined') {
      const ssoState = localStorage.getItem('sso_logged_in');
      if (ssoState === 'false') {
        setIsLoggedIn(false);
      } else {
        setIsLoggedIn(true);
      }
    }
  }, []);

  return (
    <nav className="bg-surface sticky top-0 z-50 shadow-sm h-16 w-full">
      <div className="flex justify-between items-center h-full max-w-[1280px] mx-auto px-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-h3 text-h3 text-primary font-bold">
            SKEMA Madiun
          </Link>
        </div>
        <div className="hidden md:flex items-center gap-8">
          <Link 
            href="/" 
            className={clsx(
              "font-body text-body-md transition-colors",
              pathname === '/'
                ? "text-primary font-semibold"
                : "text-text-secondary hover:text-primary-hover"
            )}
          >
            Beranda
          </Link>
          <Link 
            href="/about" 
            className={clsx(
              "font-body text-body-md transition-colors",
              pathname === '/about' 
                ? "text-primary font-semibold" 
                : "text-text-secondary hover:text-primary-hover"
            )}
          >
            Tentang Kami
          </Link>
          <Link 
            href="/statistics"
            className={clsx(
              "font-body text-body-md transition-colors",
              pathname === '/statistics' 
                ? "text-primary font-semibold" 
                : "text-text-secondary hover:text-primary-hover"
            )}
          >
            Statistik
          </Link>
        </div>
        {isLoggedIn ? (
          <ProfileAvatarDropdown />
        ) : (
          <SSOLoginButton />
        )}
      </div>
    </nav>
  );
}
