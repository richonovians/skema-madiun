import React from 'react';
import { render, screen } from '@testing-library/react';
import ChatMessageList from '../ChatMessageList';

/**
 * PEMISAH TANGGAL PADA PERCAKAPAN WARGA (21 September 2026).
 *
 * Penolongnya sudah diuji tersendiri di
 * adapters/__tests__/pemisahTanggalChat.test.js. Yang dikunci DI SINI hanya
 * satu hal yang tak dapat dijawab uji fungsi murni: bahwa daftar ini
 * benar-benar menggambar pemisahnya, dan tak kehilangan satu pesan pun ketika
 * pesan-pesan itu dikelompokkan.
 */
const pesan = (createdAt, text) => ({
  type: 'chat',
  role: 'user',
  text,
  createdAt,
  timestamp: '08.00 WIB',
  attachments: [],
});

describe('ChatMessageList — pemisah tanggal', () => {
  it('menggambar satu pemisah untuk tiap tanggal', () => {
    const kemarin = new Date(Date.now() - 86_400_000);
    render(
      <ChatMessageList
        messages={[
          pesan(kemarin.toISOString(), 'pesan kemarin'),
          pesan(new Date().toISOString(), 'pesan hari ini'),
        ]}
      />,
    );

    expect(screen.getByText('Kemarin')).toBeInTheDocument();
    expect(screen.getByText('Hari ini')).toBeInTheDocument();
  });

  it('tak menggambar pemisah kedua untuk dua pesan pada tanggal yang sama', () => {
    render(
      <ChatMessageList
        messages={[
          pesan(new Date().toISOString(), 'pagi'),
          pesan(new Date().toISOString(), 'siang'),
        ]}
      />,
    );

    expect(screen.getAllByText('Hari ini')).toHaveLength(1);
  });

  /**
   * PASANGAN yang membuat uji di atas berarti. Pengelompokan yang keliru dapat
   * menggambar seluruh pemisah dengan benar sambil diam-diam menjatuhkan
   * pesannya -- dan pemisah tanpa isi tetap terlihat rapi.
   */
  it('KONTROL: setiap pesan tetap tampil sesudah dikelompokkan', () => {
    const kemarin = new Date(Date.now() - 86_400_000);
    render(
      <ChatMessageList
        messages={[
          pesan(kemarin.toISOString(), 'pesan kemarin'),
          pesan(new Date().toISOString(), 'pesan hari ini'),
          pesan(new Date().toISOString(), 'pesan susulan'),
        ]}
      />,
    );

    expect(screen.getByText('pesan kemarin')).toBeInTheDocument();
    expect(screen.getByText('pesan hari ini')).toBeInTheDocument();
    expect(screen.getByText('pesan susulan')).toBeInTheDocument();
  });

  it('percakapan kosong tak menggambar pemisah apa pun', () => {
    render(<ChatMessageList messages={[]} />);

    expect(screen.queryByText('Hari ini')).toBeNull();
    expect(screen.queryByText('Kemarin')).toBeNull();
  });
});
