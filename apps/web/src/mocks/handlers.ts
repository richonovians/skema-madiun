import { http, HttpResponse } from 'msw';

export const handlers = [
  // Contoh handler: Mencegat request GET ke /api/v1/opd
  http.get('/api/v1/opd', () => {
    return HttpResponse.json([
      { id: '1', nama: 'Dinas Kesehatan' },
      { id: '2', nama: 'Dinas Pendidikan' },
    ]);
  }),
];
