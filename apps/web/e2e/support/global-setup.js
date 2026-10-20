import { ENV_ID, pastikanSurveiUji } from './api';
import { panaskanRute } from './pemanasan';
import { RUTE_UNTUK_PEMANASAN } from './rute';

/**
 * Disiapkan sekali sebelum worker mana pun menyala.
 *
 * Perubahan `process.env` di sini terwarisi oleh proses worker, jadi id survei
 * uji cukup dititipkan lewat variabel lingkungan — tanpa berkas perantara dan
 * tanpa dua worker berlomba membuat survei yang sama.
 */
export default async function globalSetup() {
  process.env[ENV_ID] = String(await pastikanSurveiUji());
  await panaskanRute(RUTE_UNTUK_PEMANASAN);
}
