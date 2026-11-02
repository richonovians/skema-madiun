import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ConfirmStatusModal from '../ConfirmStatusModal';

/**
 * MODAL UBAH STATUS PENGADUAN SEBAGAI DIALOG (2 November 2026, BUG-061).
 *
 * Ditemukan pada gladi bersih skenario UAT O4: `getByRole('dialog')` tak
 * menemukan apa pun selagi modal "Ubah Status Pengaduan" terbuka, dan pohon
 * aksesibilitasnya memuat sebuah tombol TANPA NAMA (silang di pojok). Kelasnya
 * sama dengan BUG-037/039; polanya mengikuti SurveyFormModalDialog.test.jsx.
 *
 * Modal ini tetap ter-mount saat tertutup (induknya merender
 * `<ConfirmStatusModal isOpen={...}/>` terus-menerus), jadi `isOpen` yang
 * menentukan, bukan keberadaan komponennya.
 */
const render1 = (props = {}) =>
  render(
    <>
      <button type="button">Tombol di halaman</button>
      <ConfirmStatusModal
        isOpen
        fromStatus="Diterima"
        toStatus="Diproses"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
        {...props}
      />
    </>,
  );

describe('ConfirmStatusModal — dialog', () => {
  it('dialog modal bernama "Ubah Status Pengaduan"', () => {
    render1();

    const dialog = screen.getByRole('dialog', { name: 'Ubah Status Pengaduan' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('tertutup: tak ada dialog sama sekali', () => {
    render1({ isOpen: false });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('tombol silang bernama "Tutup" dan memanggil onCancel', () => {
    const onCancel = jest.fn();
    render1({ onCancel });

    fireEvent.click(screen.getByRole('button', { name: 'Tutup' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('fokus berpindah ke dalam dialog saat terbuka', () => {
    render1();

    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);
  });

  /**
   * Penolakan menuntut alasan, jadi kotaknya yang paling berguna untuk difokus
   * lebih dulu. Dituntut SEKETIKA: sebelumnya fokusnya dipindah lewat
   * `setTimeout` 150 ms, yang akan berebut dengan pengurung fokus.
   */
  it('status Ditolak: fokus langsung di kotak alasan', () => {
    render1({ toStatus: 'Ditolak', requireReason: true });

    expect(
      screen.getByPlaceholderText('Tuliskan alasan penolakan pengaduan ini secara jelas...'),
    ).toHaveFocus();
  });

  /**
   * Yang membuktikan kurungan bekerja adalah fokus BERPUTAR ke elemen pertama,
   * bukan sekadar "tetap di dalam": jsdom tak menjalankan perpindahan fokus
   * bawaan Tab (pelajaran BUG-039).
   */
  it('Tab dari elemen terakhir melingkar kembali ke yang pertama', () => {
    render1();
    const dialog = screen.getByRole('dialog');
    const terfokus = Array.from(
      dialog.querySelectorAll('button:not([disabled]), textarea:not([disabled])'),
    );
    const pertama = terfokus[0];
    const terakhir = terfokus[terfokus.length - 1];

    terakhir.focus();
    fireEvent.keyDown(terakhir, { key: 'Tab' });

    expect(pertama).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Tombol di halaman' })).not.toHaveFocus();
  });
});
