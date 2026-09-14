import type { TestingModuleBuilder } from '@nestjs/testing';
import { TurnstileService } from '../../src/modules/turnstile/turnstile.service';

/**
 * Matikan gerbang captcha untuk suite yang BUKAN menguji captcha
 * (14 September 2026).
 *
 * Sakelar mati bawaan TurnstileService adalah "rahasia kosong", dan itu
 * berhenti berlaku begitu `apps/api/.env` benar-benar diisi kunci Cloudflare.
 * Sejak saat itu setiap suite yang mengirim jawaban survei publik tanpa token
 * dijawab 403 -- bukan karena kodenya salah, melainkan karena kontrak endpoint
 * memang berubah dan suitenya belum menyatakan cara memenuhinya.
 *
 * Menggantinya di sini, bukan di dalam TurnstileService, supaya kode produksi
 * tak memuat cabang khusus uji: perilaku yang dipakai warga sungguhan harus
 * sama persis dengan yang dibaca orang di berkasnya.
 *
 * Gerbangnya sendiri tetap diuji, di turnstile-survei-publik.e2e-spec.ts, yang
 * memasang tiruan dengan jawaban yang dapat diubah per uji.
 */
export function lewatiCaptcha(builder: TestingModuleBuilder): TestingModuleBuilder {
  return builder
    .overrideProvider(TurnstileService)
    .useValue({ verifikasi: () => Promise.resolve(true) });
}
