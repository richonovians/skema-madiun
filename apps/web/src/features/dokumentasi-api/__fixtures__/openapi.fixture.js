/**
 * Dipangkas dari dokumen OpenAPI SUNGGUHAN (`GET /api/docs-json`, 5 Oktober
 * 2026). Bentuk `$ref`, nama properti, `required`, `example`, `enum`,
 * `security`, dan blok `responses` di bawah disalin apa adanya -- BUKAN
 * dikarang -- supaya uji ini gagal bila bentuk dokumen yang sesungguhnya
 * berubah.
 *
 * Payload karangan pernah membuat uji lolos sementara jalur sungguhannya rusak;
 * itu sebabnya fixture ini diturunkan dari sumber hidup.
 *
 * Empat keadaan yang sengaja diwakili, semuanya ada di dokumen sungguhan:
 *   - respons sukses berbentuk ARRAY ($ref di `items`)  -> GET /surveys
 *   - respons sukses berbentuk OBJEK ($ref langsung)    -> GET /surveys/{id}
 *   - TANPA skema respons sama sekali                   -> DELETE /surveys/{id}
 *     (11 dari 65 operasi memang begini, terukur 5 Oktober 2026)
 *   - TANPA `security`, alias endpoint publik           -> GET /public/.../fill
 *     (4 dari 65 operasi begini)
 */
const BEARER = [{ bearer: [] }];

export const dokumenOpenApi = {
  openapi: '3.0.0',
  info: { title: 'API SKM & Pengaduan Masyarakat', version: '1.0' },
  // Diterbitkan `anotasiRute` di backend, bukan bawaan OpenAPI.
  'x-batas-laju-global': { limit: 100, ttlMs: 60000 },
  paths: {
    '/api/v1/surveys': {
      get: {
        operationId: 'SurveysController_list',
        summary: 'Daftar survei (Kabupaten: semua; Admin OPD: milik OPD-nya).',
        tags: ['surveys'],
        security: BEARER,
        'x-publik': false,
        'x-peran': ['kabupaten', 'opd'],
        'x-batas-laju': null,
        parameters: [
          {
            name: 'page',
            in: 'query',
            required: false,
            description: 'Nomor halaman (mulai dari 1)',
            schema: { type: 'number', minimum: 1, default: 1 },
          },
          {
            name: 'limit',
            in: 'query',
            required: false,
            description: 'Jumlah item per halaman (maksimal 100)',
            schema: { type: 'number', minimum: 1, maximum: 100, default: 20 },
          },
          {
            name: 'status',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: ['draft', 'aktif', 'ditutup'] },
          },
        ],
        responses: {
          200: {
            description: '',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/SurveyEntity' } },
              },
            },
          },
        },
      },
      post: {
        operationId: 'SurveysController_create',
        summary: 'Buat paket survei (Admin OPD).',
        tags: ['surveys'],
        security: BEARER,
        'x-publik': false,
        'x-peran': ['opd'],
        'x-batas-laju': { limit: 10, ttlMs: 60000 },
        parameters: [],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/CreateSurveyDto' } },
          },
        },
        responses: {
          201: {
            description: '',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/SurveyEntity' } },
            },
          },
        },
      },
    },
    '/api/v1/surveys/{id}': {
      get: {
        operationId: 'SurveysController_findOne',
        summary: 'Detail satu survei.',
        tags: ['surveys'],
        security: BEARER,
        'x-publik': false,
        'x-peran': [],
        'x-batas-laju': null,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'number' } }],
        responses: {
          200: {
            description: '',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/SurveyEntity' } },
            },
          },
        },
      },
      delete: {
        operationId: 'SurveysController_remove',
        summary: 'Buang survei ke Sampah (soft delete).',
        tags: ['surveys'],
        security: BEARER,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'number' } }],
        // TANPA `content`: persis seperti dokumen sungguhan.
        responses: { 200: { description: '' } },
      },
    },
    '/api/v1/complaints': {
      post: {
        operationId: 'ComplaintsController_create',
        summary: 'Ajukan pengaduan dan dapatkan nomor tiket.',
        tags: ['complaints'],
        security: BEARER,
        parameters: [],
        // BADANNYA multipart/form-data, dan skemanya ADA -- `$ref` ke DTO yang
        // sama lengkapnya dengan badan JSON mana pun. Adapter yang hanya
        // melihat `application/json` akan melaporkan endpoint ini seolah tak
        // butuh kirim apa pun.
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': { schema: { $ref: '#/components/schemas/CreateComplaintDto' } },
          },
        },
        responses: { 201: { description: '' } },
      },
    },
    '/api/v1/public/surveys/{surveyId}/fill': {
      get: {
        operationId: 'PublicSurveysController_fill',
        summary: 'Isi survei tanpa login.',
        tags: ['public'],
        'x-publik': true,
        'x-batas-laju': null,
        // TANPA `security`: endpoint publik.
        parameters: [{ name: 'surveyId', in: 'path', required: true, schema: { type: 'number' } }],
        responses: {
          200: {
            description: '',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/SurveyFillEntity' } },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      CreateSurveyDto: {
        type: 'object',
        required: ['judul', 'periode'],
        properties: {
          judul: { type: 'string', minLength: 1, maxLength: 100 },
          periode: {
            type: 'string',
            maxLength: 20,
            example: '2026-Q1',
            description: 'Format kanonik triwulan: {tahun}-Q{1-4} (D5+D8)',
          },
          allowMultipleSubmit: {
            type: 'boolean',
            default: false,
            description: 'Boleh mengisi >1 kali per periode',
          },
          izinkanAnonim: { type: 'boolean', default: false },
          opdId: { type: 'number', minimum: 1, description: 'OPD tujuan.' },
        },
      },
      SurveyEntity: {
        type: 'object',
        required: ['id', 'opdId', 'judul', 'periode', 'status', 'allowMultipleSubmit'],
        properties: {
          id: { type: 'number' },
          opdId: { type: 'number' },
          judul: { type: 'string' },
          periode: { type: 'string' },
          status: { type: 'string', enum: ['draft', 'aktif', 'ditutup'] },
          allowMultipleSubmit: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateComplaintDto: {
        type: 'object',
        required: ['kategori', 'judul', 'uraian'],
        properties: {
          opdId: {
            type: 'number',
            minimum: 1,
            description: 'Id OPD tujuan. Dikosongkan bila pengirim belum tahu tujuannya.',
          },
          kategori: {
            type: 'string',
            enum: ['aduan', 'lapor', 'lainnya'],
            description: 'Kode kategori (lihat GET /ref/complaint-categories)',
          },
          judul: { type: 'string', minLength: 1, maxLength: 255 },
          uraian: {
            type: 'string',
            minLength: 1,
            maxLength: 5000,
            description: 'Uraian pengaduan',
          },
        },
      },
      SurveyFillEntity: {
        type: 'object',
        required: ['id', 'judul', 'periode', 'status'],
        properties: {
          id: { type: 'number' },
          judul: { type: 'string' },
          periode: { type: 'string' },
          status: { type: 'string', enum: ['draft', 'aktif', 'ditutup'] },
        },
      },
    },
  },
};
