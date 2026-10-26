import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import Dropdown from '../Dropdown';

/**
 * `placeholder` DAN `disabled` (26 Oktober 2026, permintaan pengguna: dropdown
 * "Tujuan survei" dan "Metode nilai" disamakan dengan dropdown lain).
 *
 * Keduanya dulu `<select>` bawaan peramban, yang punya dua hal yang belum
 * dimiliki `Dropdown`: pilihan awal "Pilih tujuan" yang TAK DAPAT dipilih ulang
 * (memilihnya mengirim '' dan backend menolaknya), dan keadaan nonaktif saat
 * survei terkunci. Kedua prop opsional; tanpa keduanya perilaku lama utuh --
 * itu yang dijaga uji KONTROL, sebab `Dropdown` dipakai puluhan tempat.
 */
const OPSI = [
  { label: 'Kepuasan', value: 'kepuasan' },
  { label: 'Evaluasi', value: 'evaluasi' },
];

const render1 = (props = {}) =>
  render(<Dropdown label="Tujuan survei" id="tujuan" options={OPSI} onChange={jest.fn()} {...props} />);

const tombol = () => screen.getByLabelText('Tujuan survei');

describe('Dropdown — placeholder', () => {
  it('tanpa nilai, menampilkan placeholder alih-alih pilihan pertama', () => {
    render1({ value: null, placeholder: 'Pilih tujuan' });

    expect(tombol()).toHaveTextContent('Pilih tujuan');
    expect(tombol()).not.toHaveTextContent('Kepuasan');
  });

  it('placeholder tidak ikut menjadi pilihan di panel', () => {
    render1({ value: null, placeholder: 'Pilih tujuan' });

    fireEvent.click(tombol());

    expect(screen.queryByRole('button', { name: 'Pilih tujuan' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Evaluasi' })).toBeInTheDocument();
  });

  it('dengan nilai, menampilkan label nilai itu', () => {
    render1({ value: 'evaluasi', placeholder: 'Pilih tujuan' });

    expect(tombol()).toHaveTextContent('Evaluasi');
  });

  it('KONTROL: tanpa placeholder, nilai kosong tetap jatuh ke pilihan pertama seperti dulu', () => {
    render1({ value: null });

    expect(tombol()).toHaveTextContent('Kepuasan');
  });
});

describe('Dropdown — disabled', () => {
  it('nonaktif: tombolnya disabled dan panelnya tak terbuka', () => {
    const onChange = jest.fn();
    render1({ value: 'kepuasan', disabled: true, onChange });

    expect(tombol()).toBeDisabled();
    fireEvent.click(tombol());

    expect(screen.queryByRole('button', { name: 'Evaluasi' })).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('KONTROL: tanpa disabled, panelnya terbuka', () => {
    render1({ value: 'kepuasan' });

    expect(tombol()).toBeEnabled();
    fireEvent.click(tombol());

    expect(screen.getByRole('button', { name: 'Evaluasi' })).toBeInTheDocument();
  });
});
