import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import SurveyFormModal from '../SurveyFormModal';

/**
 * MODAL BUAT/UBAH SURVEI SEBAGAI DIALOG (27 Oktober 2026, BUG-039).
 *
 * Ditemukan saat probe Playwright 26 Oktober 2026: `getByRole('dialog')` tak
 * menemukan apa pun pada modal "Buat Paket Survei", padahal modalnya terbuka.
 * Kelasnya sama dengan BUG-037 (ShareSurveyModal): bagi pembaca layar ia
 * sepasang `<div>` tanpa peran dan nama, tombol silangnya hanya ikon tanpa nama,
 * dan fokus tertinggal di halaman yang tertutup modal. Polanya mengikuti
 * ShareSurveyModal dan ConfirmActionModal.
 */
const OPD_OPTIONS = [
  { value: '', label: 'Pilih OPD penyelenggara' },
  { value: '1', label: 'Dinas Kesehatan' },
];

const render1 = (props = {}) =>
  render(
    <>
      <button type="button">Tombol di halaman</button>
      <SurveyFormModal
        mode="create"
        opdOptions={OPD_OPTIONS}
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
        {...props}
      />
    </>,
  );

describe('SurveyFormModal — dialog', () => {
  it('mode buat: dialog modal bernama "Buat Paket Survei"', () => {
    render1();

    const dialog = screen.getByRole('dialog', { name: 'Buat Paket Survei' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('mode ubah: namanya mengikuti judulnya', () => {
    render1({ mode: 'edit', opdName: 'Dinas Kesehatan', initialValues: { title: 'X', period: '2026-Q1' } });

    expect(screen.getByRole('dialog', { name: 'Perbarui Detail Survei' })).toBeInTheDocument();
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
   * Versi pertama uji ini hanya menuntut fokus "tetap di dalam dialog" sesudah
   * Tab, dan tetap hijau saat `useFocusTrap` dibuang: jsdom tak menjalankan
   * perpindahan fokus bawaan Tab, jadi fokus memang tak ke mana-mana (terukur
   * lewat mutasi, 27 Oktober 2026). Yang membuktikan kurungan bekerja adalah
   * fokus BERPUTAR ke elemen pertama -- pola ShareSurveyModal.test.jsx.
   */
  it('Tab dari elemen terakhir melingkar kembali ke yang pertama', () => {
    render1();
    const dialog = screen.getByRole('dialog');
    const terfokus = Array.from(
      dialog.querySelectorAll('a[href], button:not([disabled]), input:not([disabled])'),
    );
    const pertama = terfokus[0];
    const terakhir = terfokus[terfokus.length - 1];

    terakhir.focus();
    fireEvent.keyDown(terakhir, { key: 'Tab' });

    expect(pertama).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Tombol di halaman' })).not.toHaveFocus();
  });
});
