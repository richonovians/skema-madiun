'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, Menu, X } from 'lucide-react';
import useSurveyStore from '@/features/surveys/store/useSurveyStore';
import ExitConfirmationModal from '@/components/ui/ExitConfirmationModal';
import ProfileAvatarDropdown from '@/features/profile/components/ProfileAvatarDropdown';
import clsx from 'clsx';

export default function DashboardNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  
  const { isSurveyInProgress, isCompleted, resetSurvey } = useSurveyStore();
  const [showExitModal, setShowExitModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const getLinkClass = (path, isMobile = false) => {
    if (isMobile) {
      return clsx(
        "flex items-center px-4 py-3 rounded-xl font-medium text-base transition-colors min-h-[44px]",
        pathname === path
          ? "bg-primary/10 text-primary font-bold"
          : "text-text-secondary hover:bg-slate-50 hover:text-primary"
      );
    }
    // Basic exact match for now
    return pathname === path
      ? "text-primary font-bold border-b-2 border-primary pb-1"
      : "text-secondary hover:text-primary transition-colors";
  };

  const handleNavClick = (e, targetPath) => {
    setIsMobileMenuOpen(false);
    if (isSurveyInProgress && !isCompleted) {
      e.preventDefault();
      setPendingNavigation(targetPath);
      setShowExitModal(true);
    }
  };

  const handleConfirmExit = () => {
    setShowExitModal(false);
    resetSurvey();
    if (pendingNavigation) {
      router.push(pendingNavigation);
    }
  };

  const handleCancelExit = () => {
    setShowExitModal(false);
    setPendingNavigation(null);
  };

  return (
    <>
      <header className="w-full top-0 sticky z-50 bg-surface shadow-sm border-b border-border">
        <div className="flex justify-between items-center h-16 px-6 max-w-[1280px] mx-auto w-full">
          <Link 
            href="/dashboard" 
            className="text-xl font-bold text-primary"
            onClick={(e) => handleNavClick(e, '/dashboard')}
          >
            SKEMA Madiun
          </Link>
          
          <nav className="hidden md:flex items-center space-x-8 font-body text-base">
            <Link 
              href="/" 
              className={getLinkClass('/')}
              onClick={(e) => handleNavClick(e, '/')}
            >
              Beranda
            </Link>
            <Link 
              href="/dashboard" 
              className={getLinkClass('/dashboard')}
              onClick={(e) => handleNavClick(e, '/dashboard')}
            >
              Dashboard
            </Link>
            <Link 
              href="/complaints" 
              className={getLinkClass('/complaints')}
              onClick={(e) => handleNavClick(e, '/complaints')}
            >
              Pengaduan Saya
            </Link>
            <Link 
              href="/surveys" 
              className={getLinkClass('/surveys')}
              onClick={(e) => handleNavClick(e, '/surveys')}
            >
              Survei
            </Link>
          </nav>
          
          <div className="flex items-center gap-2 md:gap-4">
            <button className="text-outline p-2 hover:bg-surface-container-low rounded-full transition-all flex items-center justify-center">
              <Bell size={20} />
            </button>
            <ProfileAvatarDropdown />
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
                className={getLinkClass('/', true)}
                onClick={(e) => handleNavClick(e, '/')}
              >
                Beranda
              </Link>
              <Link 
                href="/dashboard" 
                className={getLinkClass('/dashboard', true)}
                onClick={(e) => handleNavClick(e, '/dashboard')}
              >
                Dashboard
              </Link>
              <Link 
                href="/complaints" 
                className={getLinkClass('/complaints', true)}
                onClick={(e) => handleNavClick(e, '/complaints')}
              >
                Pengaduan Saya
              </Link>
              <Link 
                href="/surveys" 
                className={getLinkClass('/surveys', true)}
                onClick={(e) => handleNavClick(e, '/surveys')}
              >
                Survei
              </Link>
            </div>
          </div>
        )}
      </header>

      <ExitConfirmationModal 
        isOpen={showExitModal} 
        onConfirm={handleConfirmExit} 
        onCancel={handleCancelExit} 
      />
    </>
  );
}
