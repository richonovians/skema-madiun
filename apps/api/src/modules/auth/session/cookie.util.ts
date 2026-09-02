/**
 * Pembaca cookie mandiri — `cookie-parser` sengaja TIDAK ditambahkan sebagai
 * dependensi hanya untuk dua cookie (`sso_state` & `session`).
 *
 * Dipindah ke sini (2026-08-27) dari sso-state.service.ts karena pemakainya
 * bertambah: SsoStateService membaca cookie `state`, SessionCookieService &
 * SessionAuthProvider membaca cookie sesi. Menyalinnya ke masing-masing berarti
 * dua penguraian cookie yang bisa diam-diam berbeda perilaku.
 */
export function readCookie(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) {
    return null;
  }
  for (const chunk of cookieHeader.split(';')) {
    const eq = chunk.indexOf('=');
    if (eq === -1) {
      continue;
    }
    if (chunk.slice(0, eq).trim() === name) {
      return chunk.slice(eq + 1).trim() || null;
    }
  }
  return null;
}
