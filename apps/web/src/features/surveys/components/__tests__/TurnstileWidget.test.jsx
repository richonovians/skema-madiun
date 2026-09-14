import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import TurnstileWidget from '../TurnstileWidget';

/**
 * Widget captcha pada pengisian survei TANPA sesi (14 September 2026).
 *
 * Skrip Cloudflare TIDAK dimuat dalam uji ini -- jsdom tak menjalankannya, dan
 * uji yang menghubungi jaringan akan gagal di mesin tanpa internet serta lambat
 * di mesin yang punya. Yang diuji di sini adalah perekatnya: apakah widget
 * dipasang dengan site key yang benar, dan apakah token yang dikembalikannya
 * benar-benar diteruskan ke pemanggil.
 */
const asalTurnstile = window.turnstile;
const asalEnv = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

afterEach(() => {
  window.turnstile = asalTurnstile;
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = asalEnv;
});

describe('TurnstileWidget', () => {
  it('memasang widget dengan site key dan meneruskan tokennya', async () => {
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = '1x00000000000000000000AA';
    const render_ = jest.fn((_el, opsi) => {
      opsi.callback('token-dari-cloudflare');
      return 'widget-1';
    });
    window.turnstile = { render: render_, remove: jest.fn() };

    const onToken = jest.fn();
    render(<TurnstileWidget onToken={onToken} />);

    await waitFor(() => expect(render_).toHaveBeenCalledTimes(1));
    expect(render_.mock.calls[0][1].sitekey).toBe('1x00000000000000000000AA');
    expect(onToken).toHaveBeenCalledWith('token-dari-cloudflare');
  });

  /**
   * Token Turnstile kedaluwarsa dalam hitungan menit, sedangkan mengisi survei
   * bisa lebih lama. Tanpa mengosongkan tokennya saat itu terjadi, formulir
   * akan mengirim token basi dan pengisinya ditolak tanpa tahu sebabnya.
   */
  it('mengosongkan token ketika Cloudflare menyatakan kedaluwarsa', async () => {
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = '1x00000000000000000000AA';
    let opsiTersimpan;
    window.turnstile = {
      render: jest.fn((_el, opsi) => {
        opsiTersimpan = opsi;
        opsi.callback('token-awal');
        return 'widget-1';
      }),
      remove: jest.fn(),
    };

    const onToken = jest.fn();
    render(<TurnstileWidget onToken={onToken} />);
    await waitFor(() => expect(onToken).toHaveBeenCalledWith('token-awal'));

    opsiTersimpan['expired-callback']();

    expect(onToken).toHaveBeenLastCalledWith(null);
  });

  /**
   * Tanpa site key -- yaitu pengembangan tanpa akun Cloudflare -- widget tak
   * dipasang sama sekali. Backend pun mematikan verifikasinya di luar produksi,
   * jadi keduanya mati bersamaan dan tak ada layar yang menuntut sesuatu yang
   * tak dapat dipenuhi.
   */
  it('tanpa site key tidak merender apa pun', () => {
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = '';
    window.turnstile = { render: jest.fn(), remove: jest.fn() };

    const { container } = render(<TurnstileWidget onToken={jest.fn()} />);

    expect(window.turnstile.render).not.toHaveBeenCalled();
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByTestId('turnstile')).toBeNull();
  });
});
