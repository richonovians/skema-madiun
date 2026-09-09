import IsiSurveiLamaPage from '../[id]/page';
import { permanentRedirect } from 'next/navigation';

jest.mock('next/navigation', () => ({ permanentRedirect: jest.fn() }));

/**
 * Alamat pengisian survei pindah dari `/isi/:id` ke `/survei/:id`
 * (8 September 2026). Rute lama TIDAK dibuang, sebab QR yang tercetak dan
 * tersebar sejak 4 September 2026 menunjuk ke sana, dan kertas tak bisa
 * di-deploy ulang.
 *
 * Yang dijaga di sini: id-nya IKUT terbawa. Pengalihan yang kehilangan id akan
 * mendaratkan setiap pemindai QR di halaman yang salah, dan gejalanya terlihat
 * seperti survei yang hilang.
 */
describe('rute lama /isi/:id', () => {
  beforeEach(() => jest.clearAllMocks());

  it('mengalihkan permanen ke /survei/:id dengan id yang sama', async () => {
    await IsiSurveiLamaPage({ params: Promise.resolve({ id: '281' }) });

    expect(permanentRedirect).toHaveBeenCalledWith('/survei/281');
  });

  it('id lain pun terbawa, bukan dipatok satu nilai', async () => {
    await IsiSurveiLamaPage({ params: Promise.resolve({ id: '7' }) });

    expect(permanentRedirect).toHaveBeenCalledWith('/survei/7');
    expect(permanentRedirect).not.toHaveBeenCalledWith('/survei');
    expect(permanentRedirect).not.toHaveBeenCalledWith('/survei/281');
  });
});
