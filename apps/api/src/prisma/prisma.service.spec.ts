import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(() => {
    service = new PrismaService();
    jest.spyOn(service, '$connect').mockResolvedValue(undefined);
    jest.spyOn(service, '$disconnect').mockResolvedValue(undefined);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('sukses di percobaan pertama → $connect dipanggil sekali, tanpa delay', async () => {
    await service.onModuleInit();
    expect(service.$connect).toHaveBeenCalledTimes(1);
  });

  it('gagal 2x lalu sukses → retry dengan backoff, akhirnya tersambung', async () => {
    (service.$connect as jest.Mock)
      .mockRejectedValueOnce(new Error('ECONNREFUSED'))
      .mockRejectedValueOnce(new Error('ECONNREFUSED'))
      .mockResolvedValueOnce(undefined);

    const initPromise = service.onModuleInit();
    // Kejar seluruh timer backoff (1s, 2s, ...) tanpa benar-benar menunggu.
    await jest.runAllTimersAsync();
    await initPromise;

    expect(service.$connect).toHaveBeenCalledTimes(3);
  });

  it('gagal terus hingga percobaan maksimum → melempar error terakhir', async () => {
    (service.$connect as jest.Mock).mockRejectedValue(new Error('DB down permanen'));

    const initPromise = service.onModuleInit();
    initPromise.catch(() => {}); // hindari unhandled rejection saat timer masih jalan
    await jest.runAllTimersAsync();

    await expect(initPromise).rejects.toThrow('DB down permanen');
    expect(service.$connect).toHaveBeenCalledTimes(5); // MAX_CONNECT_ATTEMPTS
  });

  it('onModuleDestroy memanggil $disconnect', async () => {
    await service.onModuleDestroy();
    expect(service.$disconnect).toHaveBeenCalledTimes(1);
  });
});
