import { PENANDA_DISUNTING, redactAuditBody } from './audit-redact.util';

/**
 * TEMUAN AUDIT T8 (7 September 2026).
 *
 * `AuditInterceptor` menyalin SELURUH `request.body` ke kolom `audit_logs.detail`.
 * Untuk `POST /users` dan `PATCH /users/:id`, itu berarti nama & email yang
 * diketik admin ikut tersalin ke tabel kedua — tanpa daftar redaksi, tanpa batas
 * ukuran, dan tabel itu dapat dibaca superuser lewat `GET /audit-logs`. Di sistem
 * yang membangun gerbang persetujuan UU PDP, penggandaan data pribadi tanpa
 * alasan adalah kebalikan dari minimalisasi data.
 *
 * PRINSIPNYA: audit log perlu tahu APA YANG DISENTUH, bukan ISI datanya. Karena
 * itu KUNCInya dipertahankan dan hanya NILAInya disunting — "nama diubah" tetap
 * terekam, "diubah menjadi Budi Santoso" tidak. Menghapus kuncinya sekalian akan
 * merusak audit log itu sendiri.
 */
describe('redactAuditBody', () => {
  it('menyunting NILAI identitas tapi MEMPERTAHANKAN kuncinya', () => {
    const hasil = redactAuditBody({ nama: 'Budi Santoso', email: 'budi@example.go.id' });

    // Kuncinya tetap: audit log harus tetap menjawab "field mana yang disentuh".
    expect(Object.keys(hasil as object).sort()).toEqual(['email', 'nama']);
    expect(hasil).toEqual({ nama: PENANDA_DISUNTING, email: PENANDA_DISUNTING });
  });

  it('MEMBIARKAN field yang justru menjadi alasan audit log ada', () => {
    // Inilah yang harus terbaca saat memeriksa penyalahgunaan wewenang: peran
    // apa yang diberikan, ke OPD mana, status apa yang diubah.
    const body = { roles: ['superuser'], opdId: 7, isActive: false, status: 'diproses' };

    expect(redactAuditBody(body)).toEqual(body);
  });

  it('menyunting teks bebas yang dapat memuat cerita pribadi', () => {
    const hasil = redactAuditBody({ catatan: 'Pelapor bernama Budi, tinggal di Jl. Merdeka 3' });

    expect(hasil).toEqual({ catatan: PENANDA_DISUNTING });
  });

  it('menyunting kredensial walau hari ini belum ada yang mengirimnya', () => {
    // Asuransi murah: begitu ada endpoint yang menerima token/rahasia, ia tak
    // ikut tercetak ke tabel yang dapat dibaca manusia.
    const hasil = redactAuditBody({ password: 'x', token: 'y', secret: 'z', sig: 'w' });

    expect(Object.values(hasil as object)).toEqual([
      PENANDA_DISUNTING,
      PENANDA_DISUNTING,
      PENANDA_DISUNTING,
      PENANDA_DISUNTING,
    ]);
  });

  it('tidak peduli besar-kecil huruf pada nama kunci', () => {
    const hasil = redactAuditBody({ Nama: 'Budi', EMAIL: 'a@b.c', Catatan: 'x' });

    expect(Object.values(hasil as object)).toEqual([
      PENANDA_DISUNTING,
      PENANDA_DISUNTING,
      PENANDA_DISUNTING,
    ]);
  });

  it('menyunting di dalam objek BERSARANG, bukan hanya tingkat atas', () => {
    // Kalau hanya tingkat atas yang diperiksa, satu pembungkus saja sudah cukup
    // untuk meloloskan seluruh data pribadi.
    const hasil = redactAuditBody({ profil: { nama: 'Budi', opdId: 3 } });

    expect(hasil).toEqual({ profil: { nama: PENANDA_DISUNTING, opdId: 3 } });
  });

  it('menyunting di dalam ARRAY objek', () => {
    const hasil = redactAuditBody({ daftar: [{ nama: 'A' }, { nama: 'B', roles: ['opd'] }] });

    expect(hasil).toEqual({
      daftar: [{ nama: PENANDA_DISUNTING }, { nama: PENANDA_DISUNTING, roles: ['opd'] }],
    });
  });

  it('memangkas teks yang sangat panjang, walau kuncinya tak sensitif', () => {
    // Batas ukuran, bukan kerahasiaan: tanpa ini satu dokumen yang ditempel ke
    // sebuah field menggandakan dirinya ke tabel audit pada SETIAP penyuntingan.
    const panjang = 'x'.repeat(500);

    const hasil = redactAuditBody({ deskripsi: panjang }) as { deskripsi: string };

    expect(hasil.deskripsi.length).toBeLessThan(260);
    expect(hasil.deskripsi).toMatch(/dipangkas dari 500 karakter/);
  });

  it('bersarang terlalu dalam -> dihentikan, bukan ditelusuri tanpa batas', () => {
    let dalam: unknown = { nilai: 1 };
    for (let i = 0; i < 12; i += 1) dalam = { bungkus: dalam };

    const hasil = JSON.stringify(redactAuditBody(dalam));

    expect(hasil).toMatch(/terlalu dalam/);
  });

  it('nilai primitif & null dilewatkan apa adanya', () => {
    expect(redactAuditBody(null)).toBeNull();
    expect(redactAuditBody(42)).toBe(42);
    expect(redactAuditBody('bebas')).toBe('bebas');
    expect(redactAuditBody(undefined)).toBeUndefined();
  });

  it('objek kosong tetap objek kosong, bukan null', () => {
    // `params: {}` lazim pada POST tanpa parameter rute; ia harus tetap
    // terekam apa adanya supaya bentuk detail audit tak berubah-ubah.
    expect(redactAuditBody({})).toEqual({});
  });

  it('tidak MENGUBAH objek aslinya', () => {
    // Interceptor berjalan pada `request.body` yang masih dipakai handler; jika
    // fungsi ini menyunting di tempat, ia akan merusak permintaan yang sedang
    // berjalan.
    const asli = { nama: 'Budi', opdId: 3 };

    redactAuditBody(asli);

    expect(asli.nama).toBe('Budi');
  });
});
