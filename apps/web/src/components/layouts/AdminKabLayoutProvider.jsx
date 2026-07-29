'use client';
import React, { createContext, useContext, useState } from 'react';

const AdminKabLayoutContext = createContext({
  isMobileSidebarOpen: false,
  setIsMobileSidebarOpen: () => {},
});

export function AdminKabLayoutProvider({ children }) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <AdminKabLayoutContext.Provider value={{ isMobileSidebarOpen, setIsMobileSidebarOpen }}>
      {children}
    </AdminKabLayoutContext.Provider>
  );
}

export const useAdminKabLayout = () => useContext(AdminKabLayoutContext);
