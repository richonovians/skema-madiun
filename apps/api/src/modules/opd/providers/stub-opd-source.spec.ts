import { StubOpdSource } from './stub-opd-source';

describe('StubOpdSource', () => {
  const source = new StubOpdSource();

  it('fetchOpdList mengembalikan daftar fixture HelpdeskOpd', async () => {
    const list = await source.fetchOpdList();

    expect(list.length).toBeGreaterThan(0);
    expect(list[0]).toEqual(
      expect.objectContaining({
        externalId: expect.any(String),
        nama: expect.any(String),
        kode: expect.any(String),
      }),
    );
  });

  it('setiap fixture memiliki externalId yang unik', async () => {
    const list = await source.fetchOpdList();
    const externalIds = list.map((opd) => opd.externalId);

    expect(new Set(externalIds).size).toBe(externalIds.length);
  });
});
