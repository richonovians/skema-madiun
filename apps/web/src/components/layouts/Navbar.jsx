'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';
import SSOLoginButton from '@/features/authentication/components/SSOLoginButton';
import ProfileAvatarDropdown from '@/features/profile/components/ProfileAvatarDropdown';

export default function Navbar() {
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
      <div className="flex justify-between items-center h-full max-w-[1280px] mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="shrink-0 transition-transform duration-300 group-hover:scale-105 flex items-center">
              <Image 
                src="/images/navbar/skema-logo-transparent.png" 
                alt="Logo SKEMA" 
                width={88}
                height={48}
                className="object-contain h-8 md:h-10 w-auto"
                priority
              />
            </div>
            <span className="font-h3 text-xl md:text-2xl text-primary font-bold tracking-tight">
              SKEMA Madiun
            </span>
          </Link>
        </div>
        <div className="hidden md:flex items-center gap-8">
          <Link 
            href="/" 
            className={clsx(
              "font-body text-body-md transition-colors min-h-[44px] flex items-center",
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
              "font-body text-body-md transition-colors min-h-[44px] flex items-center",
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
              "font-body text-body-md transition-colors min-h-[44px] flex items-center",
              pathname === '/statistics' 
                ? "text-primary font-semibold" 
                : "text-text-secondary hover:text-primary-hover"
            )}
          >
            Statistik
          </Link>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          {isLoggedIn ? (
            <ProfileAvatarDropdown />
          ) : (
            <div className="hidden sm:block">
              <SSOLoginButton />
            </div>
          )}
          {/* Mobile Hamburger Button */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden flex items-center justify-center min-w-[44px] min-h-[44px] rounded-xl text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
            aria-label="Toggle Navigation Menu"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-16 bg-surface border-b border-border shadow-xl z-50 animate-in slide-in-from-top-5 duration-300">
          <div className="flex flex-col px-6 py-4 space-y-2">
            <Link 
              href="/" 
              onClick={() => setIsMobileMenuOpen(false)}
              className={clsx(
                "flex items-center px-4 py-3 rounded-xl font-medium text-base transition-colors min-h-[44px]",
                pathname === '/'
                  ? "bg-primary/10 text-primary font-bold"
                  : "text-text-secondary hover:bg-slate-50 hover:text-primary"
              )}
            >
              Beranda
            </Link>
            <Link 
              href="/about" 
              onClick={() => setIsMobileMenuOpen(false)}
              className={clsx(
                "flex items-center px-4 py-3 rounded-xl font-medium text-base transition-colors min-h-[44px]",
                pathname === '/about' 
                  ? "bg-primary/10 text-primary font-bold" 
                  : "text-text-secondary hover:bg-slate-50 hover:text-primary"
              )}
            >
              Tentang Kami
            </Link>
            <Link 
              href="/statistics"
              onClick={() => setIsMobileMenuOpen(false)}
              className={clsx(
                "flex items-center px-4 py-3 rounded-xl font-medium text-base transition-colors min-h-[44px]",
                pathname === '/statistics' 
                  ? "bg-primary/10 text-primary font-bold" 
                  : "text-text-secondary hover:bg-slate-50 hover:text-primary"
              )}
            >
              Statistik
            </Link>
            {!isLoggedIn && (
              <div className="pt-3 mt-2 border-t border-border">
                <SSOLoginButton />
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

