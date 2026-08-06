import { http, HttpResponse } from 'msw';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export const handlers = [
  // Contoh handler: Mencegat request GET ke /api/v1/opd
  http.get(`${API_BASE}/opd`, () => {
    return HttpResponse.json({
      success: true,
      data: [
        { id: 1, nama: 'Dinas Kesehatan' },
        { id: 2, nama: 'Dinas Pendidikan' },
      ],
    });
  }),

  // -- SURVEI MANAGEMENT --
  http.get(`${API_BASE}/surveys`, () => {
    return HttpResponse.json({
      success: true,
      data: [
        { id: 1, judul: 'Survei IKM 2026', periode: '2026', status: 'draft', opdId: 1 },
        { id: 2, judul: 'Survei IKM 2025', periode: '2025', status: 'aktif', opdId: 1 },
      ],
      meta: {
        pagination: { page: 1, limit: 10, total: 2 },
      },
    });
  }),

  http.post(`${API_BASE}/surveys`, async ({ request }) => {
    const body = (await request.json()) as any;
    return HttpResponse.json({
      success: true,
      data: { id: 3, ...body, status: 'draft' },
    }, { status: 201 });
  }),

  http.post(`${API_BASE}/surveys/:id/duplicate`, ({ params }) => {
    return HttpResponse.json({
      success: true,
      data: { id: 99, judul: 'Survei (Salinan)', status: 'draft' },
    }, { status: 201 });
  }),

  http.patch(`${API_BASE}/surveys/:id/status`, async ({ request, params }) => {
    const { status } = (await request.json()) as any;
    return HttpResponse.json({
      success: true,
      data: { id: Number(params.id), status },
    });
  }),

  http.delete(`${API_BASE}/surveys/:id`, () => {
    return HttpResponse.json({ success: true, message: 'Deleted' });
  }),

  // -- SURVEI BUILDER --
  http.get(`${API_BASE}/surveys/:id/questions`, () => {
    return HttpResponse.json({
      success: true,
      data: [
        { id: 10, teks: 'Pertanyaan Kustom 1', urutan: 1, tipe: 'skala', isIkmUnsur: false },
      ],
    });
  }),

  http.post(`${API_BASE}/surveys/:id/questions`, async ({ request }) => {
    const body = (await request.json()) as any;
    return HttpResponse.json({
      success: true,
      data: { id: Date.now(), teks: body.text || 'Pertanyaan baru', tipe: body.type, urutan: 99 },
    }, { status: 201 });
  }),

  http.post(`${API_BASE}/surveys/:id/questions/template`, () => {
    // Kembalikan 9 unsur baku
    const template = Array.from({ length: 9 }, (_, i) => ({
      id: 100 + i,
      teks: `Unsur ${i + 1}`,
      tipe: 'skala',
      isIkmUnsur: true,
      kodeUnsur: `U${i + 1}`,
      urutan: i + 1,
    }));
    return HttpResponse.json({ success: true, data: template }, { status: 201 });
  }),

  http.patch(`${API_BASE}/surveys/:id/questions/reorder`, async ({ request }) => {
    const { orderedIds } = (await request.json()) as any;
    return HttpResponse.json({
      success: true,
      data: orderedIds.map((id, index) => ({ id, urutan: index + 1 })),
    });
  }),
];
