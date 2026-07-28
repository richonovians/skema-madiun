'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import useSurveyStore from '@/features/surveys/store/useSurveyStore';
import ExitConfirmationModal from '@/components/ui/ExitConfirmationModal';
import ProfileAvatarDropdown from '@/features/profile/components/ProfileAvatarDropdown';

export default function DashboardNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  
  const { isSurveyInProgress, isCompleted, resetSurvey } = useSurveyStore();
  const [showExitModal, setShowExitModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);

  const getLinkClass = (path) => {
    // Basic exact match for now
    return pathname === path
      ? "text-primary font-bold border-b-2 border-primary pb-1"
      : "text-secondary hover:text-primary transition-colors";
  };

  const handleNavClick = (e, targetPath) => {
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
          
          <div className="flex items-center gap-4">
            <button className="text-outline p-2 hover:bg-surface-container-low rounded-full transition-all flex items-center justify-center">
              <Bell size={20} />
            </button>
            <ProfileAvatarDropdown />
          </div>
        </div>
      </header>

      <ExitConfirmationModal 
        isOpen={showExitModal} 
        onConfirm={handleConfirmExit} 
        onCancel={handleCancelExit} 
      />
    </>
  );
}
