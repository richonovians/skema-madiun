import type { APIRequestContext } from '@playwright/test';

/**
 * DATA CONTOH UNTUK BASIS DATA CI (30 Oktober 2026).
 *
 * Basis data job e2e-web hanya berisi seed, dan pada lari pertamanya 14 uji
 * melewati dirinya karena datanya tak ada: 11 menuntut pengaduan yang terlihat
 * oleh akun uji, 2 menuntut isi Sampah, 1 menuntut jawaban survei. Seed memang
 * memuat satu pengaduan, tetapi milik `seed-responden` dan ditujukan ke
 * DUKCAPIL -- tak terlihat oleh `seed-admin-kabupaten` sebagai `opd` (tertaut
 * DINKES) maupun sebagai `responden` -- dan belum pernah dibalas, padahal spec
 * percakapan menuntut balasan. Akibatnya halaman detail pengaduan praktis tak
 * pernah teruji di CI.
 *
 * Semuanya dibuat LEWAT API aplikasi, bukan SQL, supaya isi pengaduan
 * terenkripsi dan tersaring persis seperti data sungguhan.
 *
 * HANYA berjalan bila `E2E_DATA_CONTOH=1`, yang hanya diset ci.yml. Di laptop
 * suite ini tetap tak menulis apa pun ke skm_db selain login. Seluruh judulnya
 * berpenanda `[UJI ` sehingga bersihkan-data-uji.mjs menyapunya bila suatu saat
 * tercipta di tempat yang salah.
 *
 * Kegagalan apa pun MENGHENTIKAN jalannya uji. Data yang diam-diam tak tercipta
 * hanya akan kembali menjadi 14 lewatan yang terbaca hijau.
 */
const JUDUL_PENGADUAN = '[UJI CI] Antrean loket puskesmas';
const JUDUL_SAMPAH = '[UJI CI] Survei di Sampah';
const SURVEI_AKTIF_SEED = 'Survei Kepuasan Masyarakat Layanan Pendidikan Dasar';

type Token = Record<'responden' | 'opd' | 'kabupaten', string>;

export async function siapkanDataContohCi(api: APIRequestContext, token: Token): Promise<void> {
  const minta = async (
    metode: 'get' | 'post' | 'delete',
    path: string,
    peran: keyof Token,
    opsi: { data?: unknown; multipart?: Record<string, string> } = {},
  ) => {
    const res = await api[metode](path, {
      headers: { Authorization: `Bearer ${token[peran]}` },
      ...opsi,
    } as never);
    if (!res.ok()) {
      throw new Error(
        `data contoh CI: ${metode.toUpperCase()} ${path} sebagai ${peran} gagal ` +
          `(${res.status()}): ${(await res.text()).slice(0, 300)}`,
      );
    }
    const isi = await res.text();
    return isi ? JSON.parse(isi).data : undefined;
  };

  // Idempoten: satu pengaduan berjudul ini berarti ketiganya sudah ada.
  const milikSendiri: Array<{ title?: string; judul?: string }> =
    (await minta('get', '/api/v1/complaints?limit=50', 'responden')) ?? [];
  if (milikSendiri.some((p) => (p.judul ?? p.title) === JUDUL_PENGADUAN)) return;

  const daftarOpd: Array<{ id: number; kode: string }> = await minta(
    'get',
    '/api/v1/opd?limit=100',
    'kabupaten',
  );
  const dinkes = daftarOpd.find((o) => o.kode === 'DINKES');
  if (!dinkes) throw new Error('data contoh CI: OPD DINKES tak ada di seed');

  // 1) Pengaduan ke DINKES beserta satu balasan Admin OPD.
  const pengaduan = await minta('post', '/api/v1/complaints', 'responden', {
    multipart: {
      opdId: String(dinkes.id),
      kategori: 'lainnya',
      judul: JUDUL_PENGADUAN,
      uraian:
        'Antrean di loket pendaftaran puskesmas mengular sejak pukul tujuh pagi dan nomor antrean tidak diumumkan dengan jelas.',
    },
  });
  await minta('post', `/api/v1/complaints/${pengaduan.id}/replies`, 'opd', {
    multipart: {
      pesan: 'Terima kasih atas laporannya. Kami sedang menata ulang alur antrean di loket pendaftaran.',
    },
  });

  // 2) Satu jawaban pada survei aktif seed: Statistik & Laporan memilihnya
  //    sebagai survei bawaan, dan bilah distribusi skor butuh jawaban skala.
  const aktif: Array<{ id: number; judul?: string; title?: string }> = await minta(
    'get',
    '/api/v1/surveys/active?limit=100',
    'responden',
  );
  const survei = aktif.find((s) => (s.judul ?? s.title) === SURVEI_AKTIF_SEED);
  if (!survei) throw new Error(`data contoh CI: survei aktif "${SURVEI_AKTIF_SEED}" tak ada`);
  const isian: { questions: Array<{ id: number; tipe: string }> } = await minta(
    'get',
    `/api/v1/surveys/${survei.id}/fill`,
    'responden',
  );
  await minta('post', `/api/v1/surveys/${survei.id}/responses`, 'responden', {
    data: {
      tanpaDataDiri: true,
      answers: isian.questions
        .filter((q) => q.tipe === 'skala')
        .map((q, i) => ({ questionId: q.id, nilai: (i % 4) + 1 })),
    },
  });

  // 3) Satu survei di Sampah: dibuat lalu dibuang (soft delete).
  const sampah = await minta('post', '/api/v1/surveys', 'kabupaten', {
    data: {
      judul: JUDUL_SAMPAH,
      periode: `${new Date().getFullYear()}-Q4`,
      opdId: dinkes.id,
      jenis: 'custom',
      tujuan: 'kepuasan',
      metodeNilai: 'rata_rata',
    },
  });
  await minta('delete', `/api/v1/surveys/${sampah.id}`, 'kabupaten');
}
