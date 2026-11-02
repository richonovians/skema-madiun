import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import Dropdown from '../Dropdown';

/**
 * FOKUS SESUDAH MEMILIH (2 November 2026, sisa BUG-061).
 *
 * Saat sebuah pilihan diklik, panelnya menutup dan tombol pilihan itu lenyap
 * dari dokumen -- fokus yang sedang berada di sana jatuh ke `body`. Pengguna
 * papan ketik kehilangan tempatnya, dan modal yang dibuka oleh pilihan itu
 * (Ubah Status Pengaduan) mencatat elemen yang sudah tiada sebagai tujuan
 * pulangnya. Seperti `<select>` bawaan, fokus kini kembali ke pemicunya.
 *
 * `option.focus()` sebelum klik menirukan peramban: jsdom tak memindahkan
 * fokus pada `fireEvent.click`, sedangkan klik atau Enter sungguhan memfokus
 * tombol pilihan lebih dulu.
 */
const OPSI = [
  { label: 'Pilih Instansi', value: '' },
  { label: 'Dinas Kesehatan', value: '1' },
  { label: 'Kecamatan Wonoasri', value: '3' },
];

const render1 = (props = {}) =>
  render(
    <Dropdown label="Instansi" id="opd" options={OPSI} value="" onChange={jest.fn()} {...props} />,
  );

const pilih = (nama) => {
  const opsi = screen.getByRole('button', { name: nama });
  opsi.focus();
  fireEvent.click(opsi);
};

describe('Dropdown — fokus sesudah memilih', () => {
  it('kembali ke tombol pemicu', () => {
    const onChange = jest.fn();
    render1({ onChange });
    const pemicu = screen.getByLabelText('Instansi');

    fireEvent.click(pemicu);
    pilih('Dinas Kesehatan');

    expect(onChange).toHaveBeenCalledWith('1');
    expect(pemicu).toHaveFocus();
  });

  it('juga pada dropdown berpencarian', () => {
    render1({ searchable: true, searchPlaceholder: 'Cari instansi...' });
    const pemicu = screen.getByLabelText('Instansi');

    fireEvent.click(pemicu);
    fireEvent.change(screen.getByRole('textbox', { name: /cari instansi/i }), {
      target: { value: 'wono' },
    });
    pilih('Kecamatan Wonoasri');

    expect(pemicu).toHaveFocus();
  });
});
