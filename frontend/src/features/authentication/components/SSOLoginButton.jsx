"use client";

import React from 'react';
import Button from '@/components/ui/Button';

export default function SSOLoginButton() {
  const handleLogin = (e) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      localStorage.setItem('sso_logged_in', 'true');
      window.location.reload();
    }
  };

  return (
    <Button variant="navLogin" onClick={handleLogin}>
      Masuk via SSO Helpdesk
    </Button>
  );
}
