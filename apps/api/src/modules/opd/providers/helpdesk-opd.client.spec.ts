import { ConfigService } from '@nestjs/config';
import { HelpdeskOpdClient } from './helpdesk-opd.client';

function mockConfig(overrides: Record<string, string | undefined> = {}): ConfigService {
  const values: Record<string, string | undefined> = {
    'helpdesk.opdApiUrl': 'https://api.example.go.id/api/tenants',
    'helpdesk.opdApiToken': 'test-token',
    ...overrides,
  };
  return { get: (key: string) => values[key] } as unknown as ConfigService;
}

function mockFetchOnce(body: unknown, ok = true, status = 200): void {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    json: () => Promise.resolve(body),
  });
}

describe('HelpdeskOpdClient', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => jest.restoreAllMocks());

  it('mengambil tenant "gov" (bidang/sesi & dinas non-BAGIAN dilewati)', async () => {
    mockFetchOnce({
      success: true,
      message: 'ok',
      data: [
        { id: 'g1', name: 'Dinas Kesehatan', type: 'gov', description: 'DINKES' },
        { id: 'b1', name: 'Aptika', type: 'bidang', description: '' },
        { id: 's1', name: 'Aplikasi', type: 'sesi', description: '' },
        { id: 'd1', name: 'UPT PUSKESMAS KARE', type: 'dinas', description: '' },
        { id: 'd2', name: 'SDN MEJAYAN 01 KEC. MEJAYAN', type: 'dinas', description: '' },
        {
          id: 'd3',
          name: 'DINAS PARIWISATA, PEMUDA DAN OLAH RAGA',
          type: 'dinas',
          description: '',
        },
      ],
    });

    const client = new HelpdeskOpdClient(mockConfig());
    const result = await client.fetchOpdList();

    expect(result).toHaveLength(1);
    expect(result[0].externalId).toBe('g1');
    expect(result[0].nama).toBe('Dinas Kesehatan');
  });

  // Permintaan user 2026-08-25: tenant `dinas` berawalan "BAGIAN" ikut jadi OPD.
  describe('tenant "dinas" berawalan BAGIAN (2026-08-25)', () => {
    it('ikut diambil BERSAMA seluruh gov, kodenya diderivasi dari nama', async () => {
      mockFetchOnce({
        success: true,
        message: 'ok',
        data: [
          { id: 'g1', name: 'Sekretariat Daerah', type: 'gov', description: 'SETDA' },
          { id: 'd1', name: 'BAGIAN HUKUM', type: 'dinas', description: '' },
          { id: 'd2', name: 'BAGIAN PENGADAAN BARANG/JASA', type: 'dinas', description: '' },
          { id: 'd3', name: 'UPT PUSKESMAS KARE', type: 'dinas', description: '' },
        ],
      });

      const client = new HelpdeskOpdClient(mockConfig());
      const result = await client.fetchOpdList();

      // gov TIDAK boleh tergusur: menyaring hanya BAGIAN akan membuat
      // syncFromSource menonaktifkan seluruh OPD gov yang sudah dirujuk data.
      expect(result.map((r) => r.externalId)).toEqual(['g1', 'd1', 'd2']);
      expect(result.map((r) => r.kode)).toEqual(['SETDA', 'BAGIANHUKU', 'BAGIANPENG']);
    });

    it('"BAGIAN" harus kata utuh di awal nama, bukan sekadar awalan huruf', async () => {
      mockFetchOnce({
        success: true,
        message: 'ok',
        data: [
          { id: 'd1', name: 'BAGIANKU SENDIRI', type: 'dinas', description: '' },
          { id: 'd2', name: 'Sub BAGIAN Hukum', type: 'dinas', description: '' },
          { id: 'd3', name: 'bagian umum', type: 'dinas', description: '' },
        ],
      });

      const client = new HelpdeskOpdClient(mockConfig());
      const result = await client.fetchOpdList();

      // Hanya d3: "BAGIANKU" bukan kata "BAGIAN", dan "Sub BAGIAN" tak di awal.
      // Huruf kecil tetap diterima -- Helpdesk tak konsisten soal kapitalisasi.
      expect(result.map((r) => r.externalId)).toEqual(['d3']);
    });
  });

  it('pakai description sbg kode kalau tak kosong & muat (<=10 karakter)', async () => {
    mockFetchOnce({
      success: true,
      message: 'ok',
      data: [
        {
          id: 'g1',
          name: 'Dinas Komunikasi dan Informatika',
          type: 'gov',
          description: 'DISKOMINFO',
        },
      ],
    });

    const client = new HelpdeskOpdClient(mockConfig());
    const [opd] = await client.fetchOpdList();

    expect(opd.kode).toBe('DISKOMINFO');
  });

  it('description KOSONG (mis. kecamatan) -> derivasi dari nama, prefiks KECAMATAN disingkat KEC', async () => {
    mockFetchOnce({
      success: true,
      message: 'ok',
      data: [{ id: 'g1', name: 'Kecamatan Geger', type: 'gov', description: '' }],
    });

    const client = new HelpdeskOpdClient(mockConfig());
    const [opd] = await client.fetchOpdList();

    expect(opd.kode).toBe('KECGEGER');
    expect(opd.kode.length).toBeLessThanOrEqual(10);
  });

  it('description TERLALU PANJANG (>10 karakter, mis. KESBANGPOLDAGRI) -> fallback ke nama', async () => {
    mockFetchOnce({
      success: true,
      message: 'ok',
      data: [
        {
          id: 'g1',
          name: 'Badan Kesatuan Bangsa dan Politik Dalam Negeri',
          type: 'gov',
          description: 'KESBANGPOLDAGRI', // 16 karakter, melebihi batas kode (10)
        },
      ],
    });

    const client = new HelpdeskOpdClient(mockConfig());
    const [opd] = await client.fetchOpdList();

    expect(opd.kode.length).toBeLessThanOrEqual(10);
    expect(opd.kode).not.toBe('KESBANGPOLDAGRI');
  });

  it('dua nama yang menghasilkan kode sama (mis. 2 Kelurahan Bangunsari) -> tabrakan diberi angka', async () => {
    mockFetchOnce({
      success: true,
      message: 'ok',
      data: [
        { id: 'g1', name: 'Kelurahan Bangunsari (Dolopo)', type: 'gov', description: '' },
        { id: 'g2', name: 'Kelurahan Bangunsari (Mejayan)', type: 'gov', description: '' },
      ],
    });

    const client = new HelpdeskOpdClient(mockConfig());
    const result = await client.fetchOpdList();

    expect(result[0].kode).not.toBe(result[1].kode);
    expect(new Set(result.map((r) => r.kode)).size).toBe(2);
    for (const r of result) {
      expect(r.kode.length).toBeLessThanOrEqual(10);
    }
  });

  it('konfigurasi URL/token kosong -> lempar error jelas (bukan panggil fetch)', async () => {
    const client = new HelpdeskOpdClient(mockConfig({ 'helpdesk.opdApiToken': undefined }));

    await expect(client.fetchOpdList()).rejects.toThrow(/HELPDESK_OPD_API/);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('respons HTTP non-ok -> lempar error dengan status', async () => {
    mockFetchOnce({}, false, 401);

    const client = new HelpdeskOpdClient(mockConfig());
    await expect(client.fetchOpdList()).rejects.toThrow(/401/);
  });

  it('respons success:false -> lempar error dengan pesan Helpdesk', async () => {
    mockFetchOnce({ success: false, message: 'token tidak valid', data: [] });

    const client = new HelpdeskOpdClient(mockConfig());
    await expect(client.fetchOpdList()).rejects.toThrow(/token tidak valid/);
  });

  it('mengirim header Authorization Bearer dengan token dari config', async () => {
    mockFetchOnce({ success: true, message: 'ok', data: [] });

    const client = new HelpdeskOpdClient(mockConfig({ 'helpdesk.opdApiToken': 'rahasia-123' }));
    await client.fetchOpdList();

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.example.go.id/api/tenants',
      expect.objectContaining({ headers: { Authorization: 'Bearer rahasia-123' } }),
    );
  });
});
