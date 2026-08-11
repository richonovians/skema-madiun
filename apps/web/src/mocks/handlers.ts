import { http, HttpResponse } from 'msw';

/**
 * Mock API untuk pengujian frontend.
 *
 * DIREKAM DARI API SUNGGUHAN (10 Agustus 2026, backend di localhost:3001) — bukan
 * tebakan. Versi sebelumnya ditulis sebelum frontend & backend terintegrasi, sehingga
 * bentuk responsnya meleset; salah satunya membaca `body.text`/`body.type` padahal
 * `CreateQuestionDto` memakai `teks`/`tipe`, lalu diam-diam jatuh ke nilai cadangan.
 *
 * Tanda pada tiap handler:
 *   [REKAM]  bentuk respons diverifikasi langsung terhadap API sungguhan
 *   [TURUN]  diturunkan dari DTO/entity di apps/api (belum diverifikasi — mutasi
 *            sengaja tidak dipanggil agar database dev tidak berubah)
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// ---------------------------------------------------------------------------
// Envelope baku — dihasilkan ResponseInterceptor di backend.
// Bentuk: { success, statusCode, message, data, meta:{ timestamp, path } }
// Bila service mengembalikan PaginatedResult, `items` diangkat ke `data` dan
// `pagination` disisipkan ke `meta.pagination`.
// ---------------------------------------------------------------------------

const meta = (path) => ({ timestamp: new Date().toISOString(), path: `/api/v1${path}` });

export const ok = (data, path = '', statusCode = 200) =>
  HttpResponse.json(
    { success: true, statusCode, message: 'OK', data, meta: meta(path) },
    { status: statusCode },
  );

export const created = (data, path = '') => ok(data, path, 201);

export const paginated = (items, path = '', { page = 1, limit = 20, total = items.length } = {}) =>
  HttpResponse.json({
    success: true,
    statusCode: 200,
    message: 'OK',
    data: items,
    meta: { ...meta(path), pagination: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 } },
  });

/** Bentuk error backend (HttpException standar Nest). */
export const fail = (status, message) =>
  HttpResponse.json({ statusCode: status, message, error: true }, { status });

// ---------------------------------------------------------------------------
// Fixture — nama field mengikuti hasil rekaman.
// ---------------------------------------------------------------------------

export const opdFixture = (over = {}) => ({
  id: 1,
  externalId: '34c8464f-f976-4532-8df9-4f0d29fc5197',
  nama: 'Dinas Kesehatan',
  kode: 'DINKES',
  jenisLayanan: null,
  penanggungJawab: null,
  isActive: true,
  syncedAt: '2026-08-06T07:27:39.537Z',
  createdAt: '2026-08-06T07:26:12.311Z',
  updatedAt: '2026-08-06T07:27:39.563Z',
  activeSurveys: 0,
  openComplaints: 0,
  ...over,
});

export const surveyFixture = (over = {}) => ({
  id: 1,
  opdId: 1,
  judul: 'Survei IKM 2026',
  periode: '2026-Q1',
  status: 'draft',
  allowMultipleSubmit: false,
  createdAt: '2026-08-06T08:10:04.832Z',
  updatedAt: '2026-08-06T08:12:26.861Z',
  respondentsCount: 0,
  nilaiIkm: null,
  ...over,
});

export const questionFixture = (over = {}) => ({
  id: 1,
  surveyId: 1,
  teks: 'Persyaratan',
  tipe: 'skala',
  isIkmUnsur: true,
  kodeUnsur: 'U1',
  urutan: 1,
  createdAt: '2026-08-03T04:17:14.864Z',
  updatedAt: '2026-08-03T04:17:14.864Z',
  options: [],
  ...over,
});

/** 9 unsur baku SKM — sama persis dengan GET /ref/unsur. */
export const UNSUR = [
  { kode: 'U1', teks: 'Persyaratan' },
  { kode: 'U2', teks: 'Sistem, Mekanisme, dan Prosedur' },
  { kode: 'U3', teks: 'Waktu Penyelesaian' },
  { kode: 'U4', teks: 'Biaya/Tarif' },
  { kode: 'U5', teks: 'Produk Spesifikasi Jenis Pelayanan' },
  { kode: 'U6', teks: 'Kompetensi Pelaksana' },
  { kode: 'U7', teks: 'Perilaku Pelaksana' },
  { kode: 'U8', teks: 'Penanganan Pengaduan, Saran dan Masukan' },
  { kode: 'U9', teks: 'Sarana dan Prasarana' },
];

export const complaintFixture = (over = {}) => ({
  id: 11,
  // Format nyata: PGD + YYYYMMDD + 4 karakter acak (BUKAN "TKT-20260729-001").
  ticketNo: 'PGD20260806CDPH',
  userId: 21,
  opdId: 1,
  kategori: 'keamanan_ketertiban',
  subKategori: 'rambu',
  judul: 'Rambu lalu lintas rusak',
  uraian: 'Rambu di perempatan sudah tidak terbaca sejak bulan lalu.',
  status: 'diterima',
  createdAt: '2026-08-06T07:39:57.925Z',
  updatedAt: '2026-08-06T08:16:21.904Z',
  attachments: [],
  ...over,
});

export const notificationFixture = (over = {}) => ({
  id: 17,
  userId: 1,
  type: 'complaint_status_changed',
  title: 'Status Pengaduan Diperbarui',
  message: 'Pengaduan PGD20260806CDPH kini berstatus "Selesai"',
  link: '/admin-kab/complaints/PGD20260806CDPH',
  isRead: false,
  createdAt: '2026-08-06T08:16:21.924Z',
  ...over,
});

export const userFixture = (over = {}) => ({
  id: 21,
  ssoSubject: 'seed-responden',
  nama: 'Warga Contoh',
  email: 'warga@example.go.id',
  role: 'responden',
  opdId: null,
  isActive: true,
  lastLoginAt: '2026-08-10T07:57:10.033Z',
  createdAt: '2026-08-06T07:36:07.717Z',
  updatedAt: '2026-08-10T07:57:10.035Z',
  ...over,
});

// Daftar dasar yang dipakai beberapa handler sekaligus.
const OPD_LIST = [
  opdFixture(),
  opdFixture({ id: 2, kode: 'DISDIK', nama: 'Dinas Pendidikan', externalId: 'HD-002' }),
  opdFixture({ id: 3, kode: 'DUKCAPIL', nama: 'Dinas Kependudukan dan Pencatatan Sipil', externalId: 'HD-003' }),
];

const SURVEY_LIST = [
  surveyFixture(),
  surveyFixture({ id: 2, judul: 'Survei IKM 2025', periode: '2025-Q4', status: 'aktif', respondentsCount: 12, nilaiIkm: 81.25 }),
];

const QUESTION_LIST = UNSUR.map((u, i) =>
  questionFixture({ id: i + 1, teks: u.teks, kodeUnsur: u.kode, urutan: i + 1 }),
);

export const handlers = [
  // ===================== AUTENTIKASI =====================
  // [REKAM] dev-login membalas 201 (POST default Nest), bukan 200.
  http.post(`${API_BASE}/auth/dev-login`, async ({ request }) => {
    const body = (await request.json()) as any;
    const identifier = String(body?.identifier ?? '').trim().toLowerCase();
    if (!identifier) return fail(400, 'identifier should not be empty');
    if (identifier.includes('tidak-ada'))
      return fail(404, `Pengguna dengan email/ssoSubject "${identifier}" tidak ditemukan`);

    const role = identifier.includes('kabupaten')
      ? 'kabupaten'
      : identifier.includes('opd')
        ? 'opd'
        : 'responden';

    return created(
      {
        token: 'mock.jwt.token',
        user: userFixture({
          email: identifier,
          role,
          opdId: role === 'opd' ? 1 : null,
          respondentProfile: role === 'responden' ? null : undefined,
        }),
      },
      '/auth/dev-login',
    );
  }),

  http.post(`${API_BASE}/auth/logout`, () => ok({ success: true }, '/auth/logout')),

  // [REKAM] responden menyertakan respondentProfile; admin bernilai null.
  http.get(`${API_BASE}/auth/me`, () =>
    ok(
      userFixture({
        id: 1,
        ssoSubject: 'seed-admin-kabupaten',
        nama: 'Admin Kabupaten (Contoh)',
        email: 'admin.kabupaten@example.go.id',
        role: 'kabupaten',
        respondentProfile: null,
      }),
      '/auth/me',
    ),
  ),

  // [TURUN] mengembalikan profil terbaru, bentuk sama dengan GET /auth/me.
  http.patch(`${API_BASE}/auth/profile`, async ({ request }) => {
    const body = (await request.json()) as any;
    return ok(userFixture({ ...body, role: 'responden' }), '/auth/profile');
  }),

  // ===================== OPD =====================
  // [REKAM] berpaginasi; item diperkaya `activeSurveys` & `openComplaints`.
  http.get(`${API_BASE}/opd`, ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? 1);
    const limit = Number(url.searchParams.get('limit') ?? 20);
    const search = (url.searchParams.get('search') ?? '').toLowerCase();

    const filtered = search
      ? OPD_LIST.filter((o) => o.nama.toLowerCase().includes(search))
      : OPD_LIST;

    return paginated(filtered, '/opd', { page, limit, total: filtered.length });
  }),

  http.get(`${API_BASE}/opd/:id`, ({ params }) =>
    ok(opdFixture({ id: Number(params.id) }), `/opd/${params.id}`),
  ),

  // [TURUN]
  http.post(`${API_BASE}/opd`, async ({ request }) => {
    const body = (await request.json()) as any;
    return created(opdFixture({ id: 99, ...body }), '/opd');
  }),

  http.patch(`${API_BASE}/opd/:id`, async ({ request, params }) => {
    const body = (await request.json()) as any;
    return ok(opdFixture({ id: Number(params.id), ...body }), `/opd/${params.id}`);
  }),

  // [TURUN] laporan hasil sinkronisasi dari Helpdesk.
  http.post(`${API_BASE}/opd/sync`, () =>
    ok({ created: 2, updated: 5, deactivated: 1, skipped: 0 }, '/opd/sync'),
  ),

  // ===================== SURVEI =====================
  // [REKAM] berpaginasi (limit bawaan 20); item diperkaya `respondentsCount` & `nilaiIkm`.
  http.get(`${API_BASE}/surveys`, ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const list = status ? SURVEY_LIST.filter((s) => s.status === status) : SURVEY_LIST;
    return paginated(list, '/surveys', {
      page: Number(url.searchParams.get('page') ?? 1),
      limit: Number(url.searchParams.get('limit') ?? 20),
      total: list.length,
    });
  }),

  http.get(`${API_BASE}/surveys/active`, () =>
    paginated([SURVEY_LIST[1]], '/surveys/active', { total: 1 }),
  ),

  // [TURUN] form pengisian untuk responden.
  http.get(`${API_BASE}/surveys/:id/fill`, ({ params }) =>
    ok(
      {
        id: Number(params.id),
        judul: 'Survei IKM 2025',
        periode: '2025-Q4',
        sudahMengisi: false,
        questions: QUESTION_LIST,
      },
      `/surveys/${params.id}/fill`,
    ),
  ),

  http.get(`${API_BASE}/surveys/:id`, ({ params }) =>
    ok(surveyFixture({ id: Number(params.id) }), `/surveys/${params.id}`),
  ),

  http.post(`${API_BASE}/surveys`, async ({ request }) => {
    const body = (await request.json()) as any;
    return created(surveyFixture({ id: 3, ...body, status: 'draft' }), '/surveys');
  }),

  http.patch(`${API_BASE}/surveys/:id/status`, async ({ request, params }) => {
    const { status } = (await request.json()) as any;
    return ok(surveyFixture({ id: Number(params.id), status }), `/surveys/${params.id}/status`);
  }),

  http.patch(`${API_BASE}/surveys/:id`, async ({ request, params }) => {
    const body = (await request.json()) as any;
    return ok(surveyFixture({ id: Number(params.id), ...body }), `/surveys/${params.id}`);
  }),

  http.delete(`${API_BASE}/surveys/:id`, ({ params }) => ok(null, `/surveys/${params.id}`)),

  http.post(`${API_BASE}/surveys/:id/duplicate`, ({ params }) =>
    created(
      surveyFixture({ id: 99, judul: 'Survei IKM 2026 (Salinan)', status: 'draft' }),
      `/surveys/${params.id}/duplicate`,
    ),
  ),

  // ===================== PERTANYAAN =====================
  // [REKAM] tidak berpaginasi; item punya `surveyId`, `kodeUnsur`, dan `options`.
  http.get(`${API_BASE}/surveys/:id/questions`, ({ params }) =>
    ok(
      QUESTION_LIST.map((q) => ({ ...q, surveyId: Number(params.id) })),
      `/surveys/${params.id}/questions`,
    ),
  ),

  // [TURUN] PENTING: DTO memakai `teks` & `tipe` (versi lama keliru membaca
  // `text`/`type`, sehingga selalu jatuh ke nilai cadangan).
  http.post(`${API_BASE}/surveys/:id/questions`, async ({ request, params }) => {
    const body = (await request.json()) as any;
    if (!body?.teks) return fail(400, 'teks should not be empty');
    return created(
      questionFixture({
        id: 900,
        surveyId: Number(params.id),
        teks: body.teks,
        tipe: body.tipe,
        isIkmUnsur: body.isIkmUnsur ?? false,
        kodeUnsur: body.kodeUnsur ?? null,
        urutan: QUESTION_LIST.length + 1,
        options: body.options ?? [],
      }),
      `/surveys/${params.id}/questions`,
    );
  }),

  // [TURUN] menerapkan template 9 unsur baku; kode yang sudah ada dilewati.
  http.post(`${API_BASE}/surveys/:id/questions/template`, ({ params }) =>
    created(
      UNSUR.map((u, i) =>
        questionFixture({
          id: 100 + i,
          surveyId: Number(params.id),
          teks: u.teks,
          kodeUnsur: u.kode,
          urutan: i + 1,
        }),
      ),
      `/surveys/${params.id}/questions/template`,
    ),
  ),

  http.patch(`${API_BASE}/surveys/:id/questions/reorder`, async ({ request, params }) => {
    const { orderedIds } = (await request.json()) as any;
    return ok(
      orderedIds.map((id, index) => questionFixture({ id, surveyId: Number(params.id), urutan: index + 1 })),
      `/surveys/${params.id}/questions/reorder`,
    );
  }),

  http.patch(`${API_BASE}/questions/:id`, async ({ request, params }) => {
    const body = (await request.json()) as any;
    return ok(questionFixture({ id: Number(params.id), ...body }), `/questions/${params.id}`);
  }),

  http.delete(`${API_BASE}/questions/:id`, ({ params }) => ok(null, `/questions/${params.id}`)),

  // ===================== RESPONS & HASIL IKM =====================
  http.get(`${API_BASE}/surveys/:id/responses`, ({ params }) =>
    paginated([], `/surveys/${params.id}/responses`, { total: 0 }),
  ),

  http.post(`${API_BASE}/surveys/:id/responses`, ({ params }) =>
    created({ id: 1, surveyId: Number(params.id), createdAt: new Date().toISOString() }, `/surveys/${params.id}/responses`),
  ),

  // [TURUN] NRR per unsur + IKM + mutu (PermenPANRB 14/2017).
  http.get(`${API_BASE}/surveys/:id/results`, ({ params }) =>
    ok(
      {
        surveyId: Number(params.id),
        jumlahResponden: 12,
        nilaiIkm: 81.25,
        mutu: 'B',
        nrrPerUnsur: UNSUR.map((u) => ({ kode: u.kode, teks: u.teks, nrr: 3.25, nrrTertimbang: 0.3611 })),
      },
      `/surveys/${params.id}/results`,
    ),
  ),

  // [TURUN] ekspor membalas berkas biner — BUKAN envelope JSON.
  http.get(`${API_BASE}/surveys/:id/results/export`, ({ request }) => {
    const format = new URL(request.url).searchParams.get('format') ?? 'excel';
    const contentType =
      format === 'pdf'
        ? 'application/pdf'
        : format === 'csv'
          ? 'text/csv'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    return new HttpResponse(new Blob(['mock-export'], { type: contentType }), {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="hasil-ikm.${format === 'excel' ? 'xlsx' : format}"`,
      },
    });
  }),

  // ===================== PENGGUNA =====================
  http.get(`${API_BASE}/users`, ({ request }) => {
    const url = new URL(request.url);
    const role = url.searchParams.get('role');
    const list = [
      userFixture(),
      userFixture({ id: 22, ssoSubject: 'seed-admin-opd', nama: 'Admin OPD (Contoh)', email: 'admin.opd@example.go.id', role: 'opd', opdId: 1 }),
      userFixture({ id: 1, ssoSubject: 'seed-admin-kabupaten', nama: 'Admin Kabupaten (Contoh)', email: 'admin.kabupaten@example.go.id', role: 'kabupaten' }),
    ];
    const filtered = role ? list.filter((u) => u.role === role) : list;
    return paginated(filtered, '/users', { total: filtered.length });
  }),

  http.get(`${API_BASE}/users/:id`, ({ params }) => ok(userFixture({ id: Number(params.id) }), `/users/${params.id}`)),

  http.post(`${API_BASE}/users`, async ({ request }) => {
    const body = (await request.json()) as any;
    if (body?.role === 'opd' && !body?.opdId) return fail(400, 'opdId wajib diisi untuk role opd');
    return created(userFixture({ id: 99, ...body }), '/users');
  }),

  http.patch(`${API_BASE}/users/:id/status`, async ({ request, params }) => {
    const { isActive } = (await request.json()) as any;
    return ok(userFixture({ id: Number(params.id), isActive }), `/users/${params.id}/status`);
  }),

  http.patch(`${API_BASE}/users/:id`, async ({ request, params }) => {
    const body = (await request.json()) as any;
    return ok(userFixture({ id: Number(params.id), ...body }), `/users/${params.id}`);
  }),

  // ===================== PENGADUAN =====================
  // [REKAM] berpaginasi; item punya `subKategori` dan `attachments`.
  http.get(`${API_BASE}/complaints`, ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const list = [complaintFixture(), complaintFixture({ id: 12, ticketNo: 'PGD20260807XKQR', status: 'selesai' })];
    const filtered = status ? list.filter((c) => c.status === status) : list;
    return paginated(filtered, '/complaints', { total: filtered.length });
  }),

  http.get(`${API_BASE}/complaints/:id`, ({ params }) =>
    ok(complaintFixture({ ticketNo: String(params.id) }), `/complaints/${params.id}`),
  ),

  http.post(`${API_BASE}/complaints`, async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as any;
    return created(complaintFixture({ id: 99, ...body, status: 'diterima' }), '/complaints');
  }),

  http.patch(`${API_BASE}/complaints/:id/status`, async ({ request, params }) => {
    const { status } = (await request.json()) as any;
    return ok(complaintFixture({ status }), `/complaints/${params.id}/status`);
  }),

  http.get(`${API_BASE}/complaints/:id/replies`, ({ params }) =>
    ok([], `/complaints/${params.id}/replies`),
  ),

  http.post(`${API_BASE}/complaints/:id/replies`, async ({ request, params }) => {
    const body = (await request.json().catch(() => ({}))) as any;
    return created(
      { id: 1, complaintId: Number(params.id), authorId: 1, pesan: body?.pesan ?? '', createdAt: new Date().toISOString() },
      `/complaints/${params.id}/replies`,
    );
  }),

  // ===================== NOTIFIKASI =====================
  // [REKAM]
  http.get(`${API_BASE}/notifications`, () =>
    paginated([notificationFixture(), notificationFixture({ id: 18, isRead: true })], '/notifications', { total: 2 }),
  ),

  // [REKAM] bentuknya objek { count }, bukan angka telanjang.
  http.get(`${API_BASE}/notifications/unread-count`, () =>
    ok({ count: 1 }, '/notifications/unread-count'),
  ),

  http.patch(`${API_BASE}/notifications/read-all`, () => ok({ updated: 2 }, '/notifications/read-all')),

  http.patch(`${API_BASE}/notifications/:id/read`, ({ params }) =>
    ok(notificationFixture({ id: Number(params.id), isRead: true }), `/notifications/${params.id}/read`),
  ),

  // ===================== REFERENSI =====================
  // [REKAM] ketiganya array objek { kode, nama } / { kode, teks }.
  http.get(`${API_BASE}/ref/unsur`, () => ok(UNSUR, '/ref/unsur')),

  http.get(`${API_BASE}/ref/complaint-categories`, () =>
    ok(
      [
        { kode: 'infrastruktur', nama: 'Infrastruktur' },
        { kode: 'keamanan_ketertiban', nama: 'Keamanan dan Ketertiban' },
        { kode: 'lainnya', nama: 'Lainnya' },
      ],
      '/ref/complaint-categories',
    ),
  ),

  http.get(`${API_BASE}/ref/complaint-sub-categories`, ({ request }) => {
    const kategori = new URL(request.url).searchParams.get('kategori');
    const all = [
      { kode: 'rambu', nama: 'Rambu Lalu Lintas', kategori: 'keamanan_ketertiban' },
      { kode: 'jalan_rusak', nama: 'Jalan Rusak', kategori: 'infrastruktur' },
    ];
    return ok(kategori ? all.filter((s) => s.kategori === kategori) : all, '/ref/complaint-sub-categories');
  }),

  // ===================== DASBOR & STATISTIK =====================
  // [REKAM] objek tunggal, bukan array.
  http.get(`${API_BASE}/dashboard/ikm`, () =>
    ok(
      {
        items: [],
        rataRataIkm: null,
        totalOpd: 3,
        totalResponden: 0,
        openComplaints: 1,
        newComplaints: 1,
        systemActivityPercent: 1.9,
      },
      '/dashboard/ikm',
    ),
  ),

  http.get(`${API_BASE}/dashboard/opd`, () =>
    ok({ nilaiIkm: null, jumlahResponden: 0, openComplaints: 0, activeSurveys: 1 }, '/dashboard/opd'),
  ),

  // [REKAM]
  http.get(`${API_BASE}/statistics`, () =>
    ok(
      {
        summary: {
          ikm: null,
          totalRespondents: 0,
          totalComplaints: 1,
          completionRate: 100,
          avgSlaDays: 0,
          activeOpd: 3,
        },
        ikmTrend: [],
        complaintTrend: [{ periode: '2026-Q3', value: 1 }],
        complaintStatus: [{ status: 'selesai', count: 1 }],
        complaintCategories: [{ kode: 'keamanan_ketertiban', nama: 'Keamanan dan Ketertiban', count: 1 }],
      },
      '/statistics',
    ),
  ),

  // ===================== AUDIT LOG =====================
  http.get(`${API_BASE}/audit-logs`, () => paginated([], '/audit-logs', { total: 0 })),

  http.get(`${API_BASE}/audit-logs/:id`, ({ params }) =>
    ok({ id: Number(params.id), actorId: 1, aksi: 'CREATE', entitas: 'survey', detail: {}, createdAt: new Date().toISOString() }, `/audit-logs/${params.id}`),
  ),
];
