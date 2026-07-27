import React from 'react';

export const DUMMY_SURVEYS = [
  {
    id: '1',
    title: 'Kuesioner Evaluasi Layanan Rawat Inap RSUD',
    status: 'AKTIF',
    period: 'TRIWULAN II - 2026',
    respondentsCount: 432,
    ikmScore: 84.50,
    isClosed: false,
  },
  {
    id: '2',
    title: 'Survei Kepuasan Layanan Apotek Puskesmas',
    status: 'DRAF',
    period: 'BELUM DIATUR',
    respondentsCount: 0,
    ikmScore: null,
    isClosed: true, // draft is inherently not open
  },
  {
    id: '3',
    title: 'Evaluasi Efektivitas Layanan Administrasi Kependudukan',
    status: 'AKTIF',
    period: 'SEMESTER I - 2026',
    respondentsCount: 856,
    ikmScore: 79.20,
    isClosed: false,
  },
  {
    id: '4',
    title: 'Survei Kepuasan Masyarakat Pelayanan Perizinan',
    status: 'DITUTUP',
    period: 'TAHUN 2025',
    respondentsCount: 1205,
    ikmScore: 88.10,
    isClosed: true,
  }
];
