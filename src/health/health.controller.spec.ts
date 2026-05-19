import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { DataSource } from 'typeorm';

import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;
  let dataSource: { query: jest.Mock };
  let http: { get: jest.Mock };

  beforeEach(() => {
    dataSource = { query: jest.fn() };
    http = { get: jest.fn() };
    const config = {
      getOrThrow: jest.fn().mockReturnValue('http://order:3001'),
    };
    controller = new HealthController(
      dataSource as unknown as DataSource,
      http as unknown as HttpService,
      config as unknown as ConfigService,
    );
  });

  it('returns ok when both deps are healthy', async () => {
    dataSource.query.mockResolvedValue([{ '?column?': 1 }]);
    http.get.mockReturnValue(of({ data: { status: 'ok' } }));
    const result = await controller.check();
    expect(result.status).toBe('ok');
    expect(result.postgres).toBe('connected');
    expect(result.orderService).toBe('reachable');
  });

  it('returns degraded when postgres fails', async () => {
    dataSource.query.mockRejectedValue(new Error('down'));
    http.get.mockReturnValue(of({ data: {} }));
    const result = await controller.check();
    expect(result.status).toBe('degraded');
    expect(result.postgres).toBe('error');
  });

  it('returns degraded when order service unreachable', async () => {
    dataSource.query.mockResolvedValue([]);
    http.get.mockReturnValue(throwError(() => new Error('timeout')));
    const result = await controller.check();
    expect(result.status).toBe('degraded');
    expect(result.orderService).toBe('unreachable');
  });
});
