/**
 * Perkakas penyiapan data untuk pengujian E2E.
 *
 * Berkas ini berbicara LANGSUNG ke API — sengaja, dan hanya di sini. Yang diuji
 * E2E adalah antarmuka; menyiapkan survei lewat antarmuka admin lebih dulu
 * berarti satu kegagalan di halaman builder ikut menjatuhkan pengujian
 * pengisian, dan penyebabnya jadi kabur. Penyiapan lewat API membuat kegagalan
 * menunjuk tepat ke satu tempat.
 *
 * Aturan "Jangan akses backend langsung dari component" (AGENTS.md) berlaku
 * untuk kode aplikasi, bukan perkakas uji: tak ada satu pun berkas di bawah
 * `src/` yang mengimpor modul ini.
 */

export const BASE_URL = process.env.E2E_BASE_URL ?? 'http://skema.local';
const API = `${BASE_URL}/api/v1`;

/** Akun seed. Sandi tak ada — `POST /auth/dev-login` hanya minta identifier. */
export const AKUN = {
  warga: 'warga@example.go.id',
  adminOpd: 'admin.opd@example.go.id',
  adminKabupaten: 'admin.kabupaten@example.go.id',
};

/**
 * Survei tetap untuk E2E — DIPAKAI ULANG, tidak dibuat baru tiap kali jalan.
 *
 * Alasannya keras: transisi status backend hanya mengenal draft→aktif,
 * draft→ditutup, dan aktif→ditutup (`UpdateSurveyStatusDto`), sedangkan survei
 * hanya boleh dihapus saat berstatus draft (`SurveysService.remove`). Survei
 * yang sudah diaktifkan karena itu TIDAK DAPAT dihapus lagi — kalau tiap
 * jalannya suite membuat survei baru, basis data pengembangan akan menumpuk
 * survei mati yang tak seorang pun bisa bersihkan lewat aplikasi.
 *
 * `allowMultipleSubmit: true` yang membuat pemakaian ulang ini mungkin: dengan
 * bendera itu `ResponsesService.getFill` selalu mengembalikan
 * `sudahMengisi: false`, jadi akun warga yang sama boleh mengisi berulang kali.
 *
 * Teks pertanyaan di bawah adalah HARFIAH dan dipakai langsung sebagai
 * ekspektasi di berkas spec — bukan dibaca balik dari API, supaya perbandingan
 * tidak membandingkan jawaban dengan dirinya sendiri.
 */
export const SURVEI_UJI = {
  judul: '[UJI E2E] Survei Otomatis — jangan hapus',
  periode: '2026-Q3',
  pertanyaan: [
    {
      teks: 'Bagaimana kejelasan alur pelayanan yang Anda terima?',
      tipe: 'skala',
      // Label tersuai (bukan label baku SKM) DISENGAJA: kalau label tersuai
      // diabaikan dan wizard jatuh ke label baku, spec langsung merah. Yang
      // dikirim tetap SKOR 1-4, bukan id opsi — lihat toSubmitAnswers.
      opsi: [
        'Sangat membingungkan',
        'Agak membingungkan',
        'Cukup jelas',
        'Sangat jelas',
      ],
    },
    {
      teks: 'Melalui kanal mana Anda mengakses layanan ini?',
      tipe: 'pilihan',
      opsi: ['Datang langsung ke loket', 'Melalui situs web', 'Melalui telepon'],
    },
    {
      teks: 'Adakah saran perbaikan untuk kami?',
      tipe: 'teks',
      opsi: [],
    },
  ],
};

async function panggil(token, method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const pesan = Array.isArray(json?.message) ? json.message.join('; ') : json?.message;
    throw new Error(`${method} ${path} → HTTP ${res.status}: ${pesan ?? '(tanpa pesan)'}`);
  }
  return json?.data;
}

/**
 * Masuk lewat dev-login, lalu PASTIKAN sesinya sudah berperan.
 *
 * Sejak peran jamak (5 September 2026) `dev-login` TIDAK lagi selalu
 * menghasilkan sesi yang siap pakai. Akun ber-peran satu (warga, admin
 * kabupaten) memang langsung ber-`actingRole`, tetapi akun ber-peran banyak
 * (`admin.opd` → `['opd','responden']`, superuser → empat peran) pulang dengan
 * `actingRole: null`, dan setiap endpoint terlindung menjawab
 * **401 "Peran yang ingin dipakai belum dipilih"**.
 *
 * Kegagalannya menyesatkan kalau tak ditangani di sini: yang meledak adalah
 * `globalSetup`, jauh dari spec mana pun, dengan pesan yang terbaca seolah
 * akunnya tak berhak — padahal ia hanya belum memilih peran.
 *
 * @param {string} identifier email akun seed
 * @param {string} [peran] peran yang ingin dipakai; bila dihilangkan dipakai
 *   peran pertama yang dimiliki akun itu (urutannya dari backend: yang paling
 *   berwenang lebih dulu)
 * @returns {Promise<{token: string, user: object}>}
 */
export async function masukApi(identifier, peran) {
  let sesi;
  try {
    sesi = await panggil(null, 'POST', '/auth/dev-login', { identifier });
  } catch (err) {
    throw new Error(
      `Gagal masuk sebagai "${identifier}" lewat ${API}/auth/dev-login.\n` +
        `Pastikan server pengembangan berjalan dan dapat dicapai di ${BASE_URL}.\n` +
        `Penyebab asli: ${err.message}`,
    );
  }

  if (sesi?.user?.actingRole) return sesi;

  const dipilih = peran ?? sesi?.user?.roles?.[0];
  if (!dipilih) {
    throw new Error(
      `Akun "${identifier}" masuk tanpa peran satu pun (roles kosong). ` +
        `Seed basis data kemungkinan belum diperbarui.`,
    );
  }

  // Backend menerbitkan token BARU; token dev-login tadi tetap tanpa peran,
  // jadi ia harus ditinggalkan, bukan dipakai berdampingan.
  const hasil = await panggil(sesi.token, 'POST', '/auth/acting-role', { role: dipilih });
  return { ...sesi, token: hasil.token ?? sesi.token, user: { ...sesi.user, actingRole: dipilih } };
}

/** Nama variabel lingkungan tempat globalSetup menitipkan id survei uji. */
const ENV_ID = 'E2E_SURVEY_ID';

/**
 * Pastikan survei uji ada, aktif, dan berisi tepat pertanyaan yang diharapkan.
 *
 * HANYA dipanggil dari globalSetup, tepat satu kali sebelum worker mana pun
 * menyala — bukan dari `beforeAll` sebuah spec. `beforeAll` berjalan sekali per
 * WORKER, dan dengan `fullyParallel` dua worker sempat sama-sama melihat basis
 * data tanpa survei uji lalu sama-sama membuatnya. Dua survei berjudul sama
 * lahir, tiap worker memakai yang berbeda, dan pengujian mencari responsnya di
 * survei yang keliru. Survei aktif tak dapat dihapus, jadi kekeliruan itu
 * mengendap di basis data — cukup untuk menaruh pembuatan di satu tempat saja.
 *
 * Idempoten: sekali dibuat, pemanggilan berikutnya memakainya kembali.
 *
 * @returns {Promise<number>} id survei uji
 */
export async function pastikanSurveiUji() {
  const { token } = await masukApi(AKUN.adminOpd);

  const daftar = await panggil(token, 'GET', '/surveys?limit=100');
  const cocok = (daftar ?? []).filter(
    (s) => s.judul === SURVEI_UJI.judul && s.status === 'aktif',
  );

  if (cocok.length > 1) {
    throw new Error(
      `Ada ${cocok.length} survei aktif berjudul "${SURVEI_UJI.judul}" ` +
        `(id ${cocok.map((s) => s.id).join(', ')}).\n` +
        `Spec tak dapat menentukan mana yang dimaksud. Tutup periode survei ` +
        `yang berlebih lewat antarmuka Admin OPD sehingga tersisa satu yang aktif.`,
    );
  }

  const id = cocok.length === 1 ? cocok[0].id : await buatSurveiUji(token);
  verifikasiPertanyaan(id, await panggil(token, 'GET', `/surveys/${id}/questions`));
  return id;
}

/**
 * Survei uji yang sudah disiapkan globalSetup — dibaca, tidak pernah dibuat.
 *
 * @returns {Promise<{id: number, questions: object[]}>} `questions` bentuk
 *   backend (`{id, teks, tipe, options}`), urut sesuai `urutan`.
 */
export async function surveiUji() {
  const id = Number(process.env[ENV_ID]);
  if (!id) {
    throw new Error(
      `${ENV_ID} belum disetel. Survei uji disiapkan oleh globalSetup ` +
        `(e2e/support/global-setup.js) — jalankan lewat "pnpm test:e2e", bukan ` +
        `dengan memanggil berkas spec-nya langsung.`,
    );
  }
  const { token } = await masukApi(AKUN.adminOpd);
  const questions = await panggil(token, 'GET', `/surveys/${id}/questions`);
  verifikasiPertanyaan(id, questions);
  return { id, questions };
}

export { ENV_ID };

async function buatSurveiUji(token) {
  const survei = await panggil(token, 'POST', '/surveys', {
    judul: SURVEI_UJI.judul,
    periode: SURVEI_UJI.periode,
    allowMultipleSubmit: true,
  });

  for (const p of SURVEI_UJI.pertanyaan) {
    const dibuat = await panggil(token, 'POST', `/surveys/${survei.id}/questions`, {
      teks: p.teks,
      tipe: p.tipe,
      isIkmUnsur: false,
      // Tipe `pilihan` menerima opsinya saat dibuat; tipe `skala` tidak
      // (CreateQuestionDto), jadi label tersuainya dipasang lewat PATCH.
      ...(p.tipe === 'pilihan' ? { options: p.opsi.map((label) => ({ label })) } : {}),
    });
    if (p.tipe === 'skala') {
      await panggil(token, 'PATCH', `/questions/${dibuat.id}`, {
        options: p.opsi.map((label) => ({ label })),
      });
    }
  }

  // Pertanyaan hanya dapat ditambah selama survei berstatus draft — aktifkan
  // paling akhir.
  await panggil(token, 'PATCH', `/surveys/${survei.id}/status`, { status: 'aktif' });
  return survei.id;
}

function verifikasiPertanyaan(id, questions) {
  const diharapkan = SURVEI_UJI.pertanyaan;
  const sama =
    (questions ?? []).length === diharapkan.length &&
    questions.every((q, i) => q.teks === diharapkan[i].teks && q.tipe === diharapkan[i].tipe);

  if (!sama) {
    const terbaca = (questions ?? []).map((q) => `${q.tipe}: "${q.teks}"`).join('\n  ');
    throw new Error(
      `Survei uji (id ${id}) berjudul "${SURVEI_UJI.judul}" sudah ada di basis data,\n` +
        `tetapi pertanyaannya tidak sesuai dengan yang diharapkan spec.\n` +
        `Terbaca:\n  ${terbaca || '(tidak ada pertanyaan)'}\n` +
        `Survei aktif tidak dapat dihapus lewat aplikasi. Ubah judul survei lama itu ` +
        `lewat basis data, atau tutup periodenya, lalu jalankan ulang.`,
    );
  }
}

/**
 * Cari respons yang memuat jawaban teks tertentu.
 *
 * Dipakai untuk membuktikan pengiriman benar-benar tersimpan: halaman "Terima
 * Kasih" hanya membuktikan bahwa antarmuka mengira dirinya berhasil.
 *
 * Dicocokkan lewat jawaban teks yang unik per jalannya suite, BUKAN dengan
 * mengambil respons terbaru — survei uji ini boleh diisi berkali-kali dan
 * Playwright menjalankan spec secara paralel, sehingga "yang terbaru" bisa
 * milik pengujian lain. Respons SKM sendiri tak memuat identitas pengisi
 * (`ResponseEntity` sengaja tanpa `userId`), jadi penanda di isi jawaban
 * adalah satu-satunya cara mengenali respons milik pengujian ini.
 *
 * @returns {Promise<object|null>} respons `{id, surveyId, submittedAt, answers}`
 */
export async function cariResponsDenganTeks(surveyId, teks) {
  const { token } = await masukApi(AKUN.adminOpd);
  const rows = await panggil(token, 'GET', `/surveys/${surveyId}/responses?limit=20`);
  return (rows ?? []).find((r) => (r.answers ?? []).some((a) => a.teks === teks)) ?? null;
}
