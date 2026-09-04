const AWALAN_KUNCI = 'skema:survei-terisi:';

/**
 * Penanda "survei ini sudah diisi dari peramban ini".
 *
 * BATASNYA DINYATAKAN TERUS TERANG: menghapus data situs, memakai mode privat,
 * atau berpindah peramban mengalahkannya. Ini PENGHALANG KEJUJURAN, bukan
 * penegakan -- anti-duplikat sungguhan bertumpu pada `dedupeUserId`, yang tak
 * punya pegangan apa pun tanpa sesi. Dipilih karena begitulah survei kepuasan
 * publik memang dijalankan (satu QR di dinding loket), dan karena ia tidak
 * menghukum responden yang sah.
 *
 * Bila kelak integritas IKM perlu dijaga ketat, tautan/QR sekali pakai dapat
 * ditambahkan DI ATAS ini tanpa membongkar apa pun.
 */
export function sudahMengisiDiPeramban(surveyId) {
  try {
    return localStorage.getItem(`${AWALAN_KUNCI}${surveyId}`) === '1';
  } catch {
    // Penyimpanan diblokir -> anggap belum mengisi. Menolak pengisian karena
    // penanda tak terbaca akan menghukum responden yang sah.
    return false;
  }
}

export function tandaiSudahMengisi(surveyId) {
  try {
    localStorage.setItem(`${AWALAN_KUNCI}${surveyId}`, '1');
  } catch {
    // Sengaja diam: penanda ini memang bukan penegakan, jadi gagal menuliskannya
    // tak boleh menjatuhkan pengiriman yang sudah berhasil di server.
  }
}
