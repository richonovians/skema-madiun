import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import QuestionBlock from '../QuestionBlock';

/**
 * KALIMAT PERTANYAAN DI BUILDER BERUPA TEXTAREA (30 Oktober 2026, permintaan
 * pengguna).
 *
 * Dulu `<input>` satu baris: kalimat unsur SKM yang panjang -- "Bagaimana
 * pendapat Saudara tentang kesesuaian persyaratan pelayanan dengan jenis
 * pelayanannya?" -- terpotong ke samping dan tak pernah terbaca utuh, walau
 * kotaknya sudah selebar kartu. Kini textarea yang turun baris sendiri.
 *
 * Pertanyaan tetap SATU paragraf: layar pengisian warga tak dirancang untuk
 * pertanyaan bergaris-garis, jadi Enter tidak membuat baris baru dan baris
 * baru yang ditempel disatukan menjadi spasi.
 */
const kustom = {
  id: 'q1',
  title: 'PERTANYAAN KUSTOM #1',
  text: 'Pertanyaan baru',
  type: 'text',
  isBaku: false,
};

const baku = {
  id: 'u1',
  title: 'U1 — Persyaratan',
  text: 'Bagaimana pendapat Saudara tentang kesesuaian persyaratan pelayanan?',
  type: 'Skala',
  isBaku: true,
  options: [],
};

function pasang(question, props = {}) {
  const onUpdate = jest.fn();
  const onTextCommit = jest.fn();
  render(
    <QuestionBlock
      question={question}
      index={0}
      total={1}
      onUpdate={onUpdate}
      onDelete={() => {}}
      onTextCommit={onTextCommit}
      {...props}
    />,
  );
  return { onUpdate, onTextCommit };
}

describe('Builder — kalimat pertanyaan berupa textarea', () => {
  it('pertanyaan kustom memakai textarea', () => {
    pasang(kustom);

    expect(screen.getByPlaceholderText('Tulis pertanyaan di sini...').tagName).toBe('TEXTAREA');
  });

  it('kalimat unsur baku memakai textarea', () => {
    pasang(baku);

    expect(screen.getByLabelText('Kalimat pertanyaan U1 — Persyaratan').tagName).toBe('TEXTAREA');
  });

  it('Enter tidak membuat baris baru', () => {
    pasang(kustom);
    const kotak = screen.getByPlaceholderText('Tulis pertanyaan di sini...');

    // fireEvent mengembalikan false bila penangannya memanggil preventDefault.
    expect(fireEvent.keyDown(kotak, { key: 'Enter' })).toBe(false);
    expect(fireEvent.keyDown(kotak, { key: 'Enter', shiftKey: true })).toBe(false);
  });

  it('baris baru yang ditempel disatukan menjadi spasi', () => {
    const { onUpdate } = pasang(kustom);
    const kotak = screen.getByPlaceholderText('Tulis pertanyaan di sini...');

    fireEvent.change(kotak, { target: { value: 'Baris satu\r\nBaris dua\n\nBaris tiga' } });

    expect(onUpdate).toHaveBeenLastCalledWith('q1', { text: 'Baris satu Baris dua Baris tiga' });
  });

  it('meninggalkan kotak tetap menyimpan kalimatnya', () => {
    const { onTextCommit } = pasang(kustom);

    fireEvent.blur(screen.getByPlaceholderText('Tulis pertanyaan di sini...'));

    expect(onTextCommit).toHaveBeenCalledWith('q1', 'Pertanyaan baru');
  });

  it('KONTROL: tetap baca saja saat kalimat tak boleh disunting', () => {
    const { onTextCommit } = pasang(baku, { canEditText: false });
    const kotak = screen.getByLabelText('Kalimat pertanyaan U1 — Persyaratan');

    expect(kotak).toHaveAttribute('readonly');
    fireEvent.blur(kotak);
    expect(onTextCommit).not.toHaveBeenCalled();
  });
});
