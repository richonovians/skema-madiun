/** Token DI untuk AuthProvider. Saat SSO aktif, cukup ganti implementasi di balik token ini. */
export const AUTH_PROVIDER = 'AUTH_PROVIDER';

/**
 * Token DI untuk SsoSource — percakapan OAuth2 dengan penyedia identitas.
 * Dipisah dari AUTH_PROVIDER karena keduanya menjawab pertanyaan berbeda:
 * AUTH_PROVIDER menjawab "siapa pemilik request ini", SSO_SOURCE menjawab
 * "bagaimana memperoleh identitas awalnya dari Helpdesk".
 */
export const SSO_SOURCE = 'SSO_SOURCE';
