import React from 'react';
import { render, screen } from '@testing-library/react';
import AuditChanges from '../AuditChanges';

/**
 * BUG-064 (3 November 2026). Tiga rute `update_status` kini mencatat nilai
 * lama sebagai `sebelum`. Tanpa blok "Perubahan", draf -> aktif dan
 * ditutup -> aktif tetap terbaca sama di layar meski basis datanya sudah
 * membedakannya.
 */
const baris = (over = {}) => ({
  id: 5,
  aksi: 'update_status',
  entitas: 'survey',
  params: { id: '755' },
  body: { status: 'aktif' },
  sebelum: null,
  ...over,
});

describe('AuditChanges', () => {
  it('menampilkan nilai lama lalu nilai baru bila sebelum tercatat', () => {
    render(<AuditChanges log={baris({ sebelum: { status: 'ditutup' } })} />);

    expect(screen.getByRole('heading', { name: 'Perubahan' })).toBeInTheDocument();
    expect(screen.getByRole('term')).toHaveTextContent('Status');
    expect(screen.getByRole('definition')).toHaveTextContent(/ditutup.*menjadi.*aktif/);
  });

  it('isActive dibaca sebagai status akun Aktif/Nonaktif', () => {
    render(
      <AuditChanges
        log={baris({
          entitas: 'user',
          body: { isActive: false },
          sebelum: { isActive: true },
        })}
      />,
    );

    expect(screen.getByRole('term')).toHaveTextContent('Status akun');
    expect(screen.getByRole('definition')).toHaveTextContent(/Aktif.*menjadi.*Nonaktif/);
  });

  it('baris lama tanpa sebelum tidak menampilkan blok Perubahan; payload tetap tampil', () => {
    render(<AuditChanges log={baris()} />);

    expect(screen.queryByRole('heading', { name: 'Perubahan' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Payload Permintaan' })).toBeInTheDocument();
  });

  it('tanpa body maupun sebelum tidak merender apa pun', () => {
    const { container } = render(<AuditChanges log={baris({ body: null })} />);
    expect(container).toBeEmptyDOMElement();
  });
});
