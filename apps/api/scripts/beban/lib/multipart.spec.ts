import { susunMultipart } from './multipart';

/**
 * Tubuh multipart dibaca balik oleh pengurai multipart BAWAAN Node
 * (`Response.formData()` milik undici), bukan dicocokkan dengan string yang
 * disusun sendiri. Pembanding yang ditulis dengan tangan akan mengulang salah
 * paham yang sama dengan penyusunnya; pengurai sungguhan tidak.
 */
async function urai(isi: Buffer, contentType: string): Promise<FormData> {
  return new Response(new Uint8Array(isi), { headers: { 'content-type': contentType } }).formData();
}

describe('susunMultipart', () => {
  it('medan teks terbaca balik apa adanya', async () => {
    const { isi, contentType } = susunMultipart({
      tingkat: 'kabupaten',
      judul: '[UJI BEBAN] Jalan rusak',
      lokasiKejadian: 'Jl. Contoh No. 1, Desa Contoh',
    });
    const form = await urai(isi, contentType);
    expect(form.get('tingkat')).toBe('kabupaten');
    expect(form.get('judul')).toBe('[UJI BEBAN] Jalan rusak');
    expect(form.get('lokasiKejadian')).toBe('Jl. Contoh No. 1, Desa Contoh');
  });

  it('berkas terbaca balik dengan nama, tipe, dan isi yang sama bita demi bita', async () => {
    const data = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0xff]);
    const { isi, contentType } = susunMultipart({ judul: 'x' }, [
      { medan: 'lampiran', namaBerkas: 'bukti.png', tipe: 'image/png', isi: data },
    ]);
    const form = await urai(isi, contentType);
    const berkas = form.get('lampiran') as File;
    expect(berkas.name).toBe('bukti.png');
    expect(berkas.type).toBe('image/png');
    expect(Buffer.from(await berkas.arrayBuffer()).equals(data)).toBe(true);
  });

  it('menolak isi yang memuat batasnya sendiri, karena tubuhnya akan terpotong diam-diam', () => {
    const { contentType } = susunMultipart({ a: 'b' });
    const batas = contentType.split('boundary=')[1];
    expect(() => susunMultipart({ a: `--${batas}` }, [], batas)).toThrow(/batas/);
  });
});
