import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { http } from 'msw';
import { setupServer } from 'msw/node';
import { handlers } from '@/mocks/handlers';
import ForwardComplaintModal from '../ForwardComplaintModal';

/**
 * MODAL TERUSKAN PENGADUAN SEBAGAI DIALOG (2 November 2026, BUG-062).
 *
 * Ditemukan pada gladi bersih skenario UAT K2: modal "Teruskan ke OPD
 * berwenang" tampil di pohon aksesibilitas tanpa wadah dialog. Tombol tutupnya
 * sudah bernama; yang hilang peran, nama dialog, dan kurungan fokus.
 *
 * Escape ditambahkan bersama perbaikan ini atas persetujuan pengguna: pola
 * dialog standar, dan SurveyFormModal sudah mendukungnya. Selagi pengiriman
 * berjalan ia diabaikan, sama seperti tombol Batal yang dimatikan.
 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const render1 = (props = {}) =>
  render(
    <>
      <button type="button">Tombol di halaman</button>
      <ForwardComplaintModal
        complaint={{ id: 99, ticketNo: 'PGD1' }}
        onClose={jest.fn()}
        onDone={jest.fn()}
        {...props}
      />
    </>,
  );

describe('ForwardComplaintModal — dialog', () => {
  it('dialog modal bernama "Teruskan ke OPD berwenang"', async () => {
    render1();
    await screen.findByLabelText(/opd yang berwenang/i);

    const dialog = screen.getByRole('dialog', { name: 'Teruskan ke OPD berwenang' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('fokus berpindah ke dalam dialog saat terbuka', async () => {
    render1();
    await screen.findByLabelText(/opd yang berwenang/i);

    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);
  });

  it('Tab dari elemen terakhir melingkar kembali ke yang pertama', async () => {
    render1();
    await screen.findByLabelText(/opd yang berwenang/i);
    const dialog = screen.getByRole('dialog');
    const terfokus = Array.from(dialog.querySelectorAll('button:not([disabled]), input:not([disabled])'));
    const pertama = terfokus[0];
    const terakhir = terfokus[terfokus.length - 1];

    terakhir.focus();
    fireEvent.keyDown(terakhir, { key: 'Tab' });

    expect(pertama).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Tombol di halaman' })).not.toHaveFocus();
  });

  it('Escape menutup modal', async () => {
    const onClose = jest.fn();
    render1({ onClose });
    await screen.findByLabelText(/opd yang berwenang/i);

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  /**
   * Uji ini HIJAU sebelum perbaikan karena Escape memang belum menutup apa pun;
   * yang membuktikannya bukan hampa adalah mutasi penjaga `sedangKirim`.
   */
  it('Escape diabaikan selagi pengiriman berjalan', async () => {
    server.use(http.patch(`${API_BASE}/complaints/:id/opd`, () => new Promise(() => {})));
    const onClose = jest.fn();
    render1({ onClose });

    fireEvent.click(await screen.findByLabelText(/opd yang berwenang/i));
    fireEvent.click(await screen.findByRole('button', { name: 'Dinas Kesehatan' }));
    fireEvent.click(screen.getByRole('button', { name: /^teruskan$/i }));
    await screen.findByRole('button', { name: /^batal$/i, hidden: false });
    expect(screen.getByRole('button', { name: /^batal$/i })).toBeDisabled();

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).not.toHaveBeenCalled();
  });
});
