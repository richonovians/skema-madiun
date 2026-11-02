import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ComplaintStatusControl from '../ComplaintStatusControl';
import ConfirmStatusModal from '@/components/ui/ConfirmStatusModal';

/**
 * SISA BUG-061 (2 November 2026): sesudah modal Ubah Status Pengaduan ditutup,
 * fokus jatuh ke `body`, bukan kembali ke dropdown status. Pemicu modal adalah
 * butir pilihan dropdown yang ikut lenyap saat panelnya menutup, sehingga
 * `useFocusTrap` tak punya tujuan pulang.
 *
 * Dirangkai persis seperti halaman detail pengaduan admin: pilihan dropdown
 * memasang status tertunda, dan modal terbuka selama status itu ada.
 */
function Rangkaian() {
  const [tertunda, setTertunda] = useState(null);
  return (
    <>
      <ComplaintStatusControl currentStatus="Diterima" onStatusChangeRequest={setTertunda} />
      <ConfirmStatusModal
        isOpen={!!tertunda}
        fromStatus="Diterima"
        toStatus={tertunda ?? ''}
        onConfirm={jest.fn()}
        onCancel={() => setTertunda(null)}
      />
    </>
  );
}

it('Batal pada modal Ubah Status mengembalikan fokus ke dropdown status', () => {
  render(<Rangkaian />);
  const pemicu = screen.getByRole('button', { name: 'Diterima' });

  fireEvent.click(pemicu);
  const diproses = screen.getByRole('button', { name: 'Diproses' });
  diproses.focus();
  fireEvent.click(diproses);
  expect(screen.getByRole('dialog', { name: 'Ubah Status Pengaduan' })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Batal' }));

  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(pemicu).toHaveFocus();
});
