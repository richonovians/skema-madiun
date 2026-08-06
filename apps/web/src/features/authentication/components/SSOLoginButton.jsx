'use client';

import React, { useState } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { authApi } from '../services/sso.api';
import { saveSession } from '../services/authStorage';

// Sementara: form dev-login (identifier = email/ssoSubject akun seed) menggantikan
// tombol SSO Helpdesk sungguhan yang menunggu spesifikasi OAuth dari Helpdesk (SSO-1).
export default function SSOLoginButton() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const res = await authApi.devLogin(identifier);
      saveSession(res.data.token, res.data.user?.role);
      window.location.reload();
    } catch (err) {
      setError(err.message || 'Login gagal');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isFormOpen) {
    return (
      <Button variant="navLogin" onClick={() => setIsFormOpen(true)}>
        Masuk via SSO Helpdesk
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <Input
        type="text"
        placeholder="Email akun (dev-login)"
        value={identifier}
        onChange={(e) => setIdentifier(e.target.value)}
        className="w-56"
        required
      />
      <Button type="submit" variant="navLogin" disabled={isLoading}>
        {isLoading ? 'Memproses...' : 'Masuk'}
      </Button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </form>
  );
}
