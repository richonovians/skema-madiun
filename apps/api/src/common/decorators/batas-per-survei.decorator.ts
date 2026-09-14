import { SetMetadata } from '@nestjs/common';

export const BATAS_PER_SURVEI_KEY = 'batasPerSurvei';

/**
 * Hitung batas laju TERPISAH untuk tiap survei pada rute ini
 * (14 September 2026).
 *
 * Tanpa ini, satu penghitung per IP menaungi seluruh survei publik sekaligus,
 * sehingga membanjiri satu survei ikut menghabiskan jatah survei lain --
 * penyerang yang menyasar survei Puskesmas dapat menutup pengisian survei
 * Pendidikan bagi warga di jaringan yang sama, tanpa menyentuhnya.
 *
 * Ini mempersempit radius ledakan, BUKAN menahan banjirnya. Batas per IP tak
 * dapat membedakan loket layanan yang ramai dari bot, dan itu pekerjaan
 * captcha.
 *
 * Dipasang lewat dekorator, bukan diberlakukan ke semua rute ber-`:surveyId`:
 * memecah penghitung berarti melipatgandakan jumlah ember, dan itu hanya
 * sepadan di rute yang memang dibuka untuk umum.
 */
export const BatasPerSurvei = () => SetMetadata(BATAS_PER_SURVEI_KEY, true);
