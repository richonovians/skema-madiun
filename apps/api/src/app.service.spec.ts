import { AppService } from './app.service';

describe('AppService', () => {
  const service = new AppService();

  it('getHealth mengembalikan status ok untuk service skm-api', () => {
    const result = service.getHealth();

    expect(result.status).toBe('ok');
    expect(result.service).toBe('skm-api');
    expect(typeof result.timestamp).toBe('string');
    expect(Number.isNaN(Date.parse(result.timestamp))).toBe(false);
  });
});
