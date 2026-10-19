import { salinTeks } from '../lib/salin';

/**
 * CACAT YANG DIJAGA DI SINI, terukur di peramban 6 Oktober 2026:
 *
 *   origin              : http://skema.local
 *   isSecureContext     : false
 *   navigator.clipboard : undefined
 *
 * Clipboard API dikunci ke secure context. HTTPS dan `localhost` lolos;
 * `skema.local` lewat HTTP polos tidak. Versi pertama tombol salin memanggil
 * `navigator.clipboard.writeText` di dalam `try/catch` kosong, jadi di seluruh
 * lingkungan pengembangan ia gagal TANPA SUARA -- tombolnya tetap bertuliskan
 * "Salin" dan tak ada apa pun yang tersalin.
 */
describe('salinTeks', () => {
  const clipboardAsli = Object.getOwnPropertyDescriptor(navigator, 'clipboard');

  const pasangClipboard = (nilai) =>
    Object.defineProperty(navigator, 'clipboard', { value: nilai, configurable: true });

  afterEach(() => {
    if (clipboardAsli) Object.defineProperty(navigator, 'clipboard', clipboardAsli);
    else delete navigator.clipboard;
    delete document.execCommand;
  });

  it('memakai Clipboard API bila tersedia', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    pasangClipboard({ writeText });
    document.execCommand = jest.fn();

    await expect(salinTeks('halo')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('halo');
    expect(document.execCommand).not.toHaveBeenCalled();
  });

  it('jatuh ke execCommand saat clipboard tak ada (origin tak aman)', async () => {
    pasangClipboard(undefined);
    document.execCommand = jest.fn().mockReturnValue(true);

    await expect(salinTeks('halo')).resolves.toBe(true);
    expect(document.execCommand).toHaveBeenCalledWith('copy');
  });

  it('jatuh ke execCommand saat Clipboard API melempar', async () => {
    pasangClipboard({ writeText: jest.fn().mockRejectedValue(new Error('ditolak')) });
    document.execCommand = jest.fn().mockReturnValue(true);

    await expect(salinTeks('halo')).resolves.toBe(true);
  });

  it('melaporkan gagal bila kedua jalur gagal, bukan diam', async () => {
    pasangClipboard(undefined);
    document.execCommand = jest.fn().mockReturnValue(false);

    await expect(salinTeks('halo')).resolves.toBe(false);
  });

  it('tidak meninggalkan textarea bantu di DOM', async () => {
    pasangClipboard(undefined);
    document.execCommand = jest.fn().mockReturnValue(true);

    await salinTeks('halo');
    expect(document.querySelectorAll('textarea')).toHaveLength(0);
  });
});
