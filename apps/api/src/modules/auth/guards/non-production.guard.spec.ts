import { NotFoundException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { NonProductionGuard } from './non-production.guard';

const buildGuard = (nodeEnv: string) => {
  const config = { get: jest.fn().mockReturnValue(nodeEnv) } as unknown as ConfigService;
  return new NonProductionGuard(config);
};

describe('NonProductionGuard', () => {
  it('production → melempar NotFoundException (404, bukan 403)', () => {
    const guard = buildGuard('production');
    expect(() => guard.canActivate()).toThrow(NotFoundException);
  });

  it('development → mengizinkan (true)', () => {
    const guard = buildGuard('development');
    expect(guard.canActivate()).toBe(true);
  });

  it('test → mengizinkan (true)', () => {
    const guard = buildGuard('test');
    expect(guard.canActivate()).toBe(true);
  });
});
