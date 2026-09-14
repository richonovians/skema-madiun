import { test, expect } from '@playwright/test';
import { AKUN, SURVEI_UJI, surveiUji, cariResponsDenganTeks } from './support/api';
import { masukSebagai } from './support/masuk';

/**
 * TC-FE-009 — E2E: Isi Survei dari Login sampai Selesai.
 *
 * Menelusuri jalur terpenting warga: masuk, buka survei, jawab ketiga tipe
 * pertanyaan, kirim, dan lihat halaman terima kasih. Kegagalan di jalur ini
 * berarti layanan publiknya tak dapat dipakai sama sekali.
 *
 * Kerusakan yang ditangkap berkas ini:
 *  - `adaptFillQuestion` berhenti meneruskan `type` → kartu jatuh ke peringatan
 *    "tipe pertanyaan belum dapat ditampilkan", tak ada opsi yang bisa dipilih;
 *  - label skala tersuai diabaikan dan wizard kembali ke label baku SKM;
 *  - pertanyaan pilihan ganda kehilangan opsinya (bentuk kerusakan BUG-005) →
 *    tombol lanjut nonaktif permanen dan responden tersangkut;
 *  - `toSubmitAnswers` mengirim id opsi sebagai `nilai` (atau sebaliknya) →
 *    backend menolak, halaman terima kasih tak pernah muncul;
 *  - pengiriman tampak berhasil di layar tetapi tak pernah tersimpan.
 */

const KE_1 = SURVEI_UJI.pertanyaan[0];
const KE_2 = SURVEI_UJI.pertanyaan[1];
const KE_3 = SURVEI_UJI.pertanyaan[2];

/** Opsi jawaban dirender sebagai <input class="hidden peer"> di dalam <label> —
 *  inputnya tak dapat diklik (dan tak masuk pohon aksesibilitas), jadi yang
 *  ditekan adalah labelnya. Lihat components/ui/RadioCard.jsx. */
const opsi = (page, label) =>
  page.locator('label').filter({ has: page.getByText(label, { exact: true }) });

const tombolLanjut = (page) => page.getByRole('button', { name: 'Pertanyaan Selanjutnya' });
const tombolKirim = (page) => page.getByRole('button', { name: 'Kirim Survei' });

/**
 * Buka survei dan lewati gerbang "Sebelum Anda Mulai Mengisi".
 *
 * Gerbang ini (`GerbangPengisianBersesi`, September 2026) berdiri SEBELUM soal
 * pertama dan menawarkan kotak "kirim sebagai anonim". Tanpa melewatinya,
 * `Pertanyaan 1 dari 3` memang tak pernah dirender — dan kegagalannya terbaca
 * seolah wizard-nya yang rusak, bukan sekadar satu layar yang belum dilewati.
 *
 * Tombolnya ditunggu, bukan diharuskan: survei yang tak berpintu (atau
 * perubahan rancangan berikutnya) tetap boleh lewat tanpa membuat spec ini
 * merah karena alasan yang salah.
 */
async function bukaSurvei(page, surveyId) {
  await page.goto(`/surveys/${surveyId}`);
  const mulai = page.getByRole('button', { name: 'Mulai Isi Survei' });
  const berpintu = await mulai
    .waitFor({ state: 'visible', timeout: 10000 })
    .then(() => true)
    .catch(() => false);
  if (berpintu) await mulai.click();
}

test.describe('Pengisian survei oleh responden', () => {
  let surveyId;
  /** Bentuk backend `{id, teks, tipe, options}` — dibaca sekali, dipakai
   *  sebagai sumber id pertanyaan & id opsi saat memeriksa data tersimpan. */
  let pertanyaan;

  test.beforeAll(async () => {
    ({ id: surveyId, questions: pertanyaan } = await surveiUji());
  });

  test('warga menyelesaikan survei tiga tipe pertanyaan dan jawabannya tersimpan', async ({
    page,
  }) => {
    // Penanda unik: respons SKM tak memuat identitas pengisi, jadi hanya lewat
    // isi jawaban inilah respons milik pengujian ini dapat dikenali kembali.
    const saran = `[UJI E2E] saran otomatis ${Date.now()}`;

    await masukSebagai(page, AKUN.warga, '/dashboard');
    await bukaSurvei(page, surveyId);

    // --- Pertanyaan 1: skala berlabel tersuai ---
    await expect(page.getByRole('heading', { name: 'Pertanyaan 1 dari 3' })).toBeVisible();
    await expect(page.getByRole('heading', { name: `1. ${KE_1.teks}` })).toBeVisible();
    // Label baku SKM TIDAK boleh muncul: pertanyaan ini punya label sendiri.
    await expect(page.getByText('Sangat Cepat / Sangat Baik')).toBeHidden();

    await expect(tombolLanjut(page)).toBeDisabled();
    await opsi(page, KE_1.opsi[3]).click();
    await tombolLanjut(page).click();

    // --- Pertanyaan 2: pilihan ganda ---
    await expect(page.getByRole('heading', { name: `2. ${KE_2.teks}` })).toBeVisible();
    for (const label of KE_2.opsi) {
      await expect(opsi(page, label)).toBeVisible();
    }
    await opsi(page, KE_2.opsi[1]).click();
    await tombolLanjut(page).click();

    // --- Pertanyaan 3: uraian ---
    await expect(page.getByRole('heading', { name: `3. ${KE_3.teks}` })).toBeVisible();
    await page.getByPlaceholder('Tuliskan jawaban Anda di sini...').fill(saran);
    await tombolKirim(page).click();

    await expect(page.getByRole('heading', { name: 'Terima Kasih!' })).toBeVisible();

    // Layar boleh saja mengaku berhasil; yang menentukan adalah apa yang
    // tersimpan. Nilai yang diharapkan ditulis harfiah, bukan dihitung ulang
    // dengan kode yang sedang diuji.
    const respons = await cariResponsDenganTeks(surveyId, saran);
    expect(respons, `Respons berteks "${saran}" tidak ditemukan di backend`).not.toBeNull();

    const jawaban = Object.fromEntries(respons.answers.map((a) => [a.questionId, a]));
    const [q1, q2, q3] = pertanyaan;

    // Skala mengirim SKOR (opsi ke-4 → 4), bukan id opsinya. Inilah yang dulu
    // ditolak backend dengan "Opsi N bukan opsi pertanyaan M".
    expect(jawaban[q1.id].nilai).toBe(4);
    expect(jawaban[q1.id].selectedOptionId).toBeNull();

    // Pilihan ganda sebaliknya: id opsi, bukan nomor urut.
    expect(jawaban[q2.id].selectedOptionId).toBe(q2.options[1].id);
    expect(jawaban[q2.id].nilai).toBeNull();

    expect(jawaban[q3.id].teks).toBe(saran);
  });

  test('pertanyaan uraian boleh dilewati tanpa mengunci tombol kirim', async ({ page }) => {
    // Pernah rusak: tombol lanjut dikunci untuk SEMUA tipe, sehingga satu
    // pertanyaan uraian yang dikosongkan membuat responden mentok tak bisa
    // menyelesaikan survei (lihat catatan di SurveyNavigation.jsx).
    await masukSebagai(page, AKUN.warga, '/dashboard');
    await bukaSurvei(page, surveyId);

    await opsi(page, KE_1.opsi[0]).click();
    await tombolLanjut(page).click();
    await opsi(page, KE_2.opsi[0]).click();
    await tombolLanjut(page).click();

    await expect(page.getByRole('heading', { name: `3. ${KE_3.teks}` })).toBeVisible();
    await expect(page.getByPlaceholder('Tuliskan jawaban Anda di sini...')).toHaveValue('');
    await expect(tombolKirim(page)).toBeEnabled();

    await tombolKirim(page).click();
    await expect(page.getByRole('heading', { name: 'Terima Kasih!' })).toBeVisible();
  });
});
