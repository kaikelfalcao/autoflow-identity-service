import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AxiosError, AxiosResponse } from 'axios';
import { of, throwError } from 'rxjs';

import {
  CustomerDto,
  OrderServiceClient,
  OrderServiceUnavailableError,
} from './order-service.client';

jest.useFakeTimers();

describe('OrderServiceClient', () => {
  let client: OrderServiceClient;
  let http: { get: jest.Mock };
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    http = { get: jest.fn() };
    const config = {
      getOrThrow: jest.fn().mockReturnValue('http://order-service:3001'),
    };
    client = new OrderServiceClient(
      http as unknown as HttpService,
      config as unknown as ConfigService,
    );
    warnSpy = jest.spyOn(client['logger'], 'warn');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mkResponse = <T>(data: T, status = 200): AxiosResponse<T> =>
    ({
      data,
      status,
      statusText: 'OK',
      headers: {},
      config: { headers: {} as never },
    }) as unknown as AxiosResponse<T>;

  it('returns customer on 200', async () => {
    const customer: CustomerDto = {
      id: 'c1',
      name: 'A',
      active: true,
      documentNumber: '52998224725',
    };
    http.get.mockReturnValueOnce(of(mkResponse(customer)));
    const promise = client.findCustomerByDocument('52998224725');
    await jest.runAllTimersAsync();
    await expect(promise).resolves.toEqual(customer);
  });

  it('returns inactive customer as-is', async () => {
    const customer: CustomerDto = {
      id: 'c1',
      name: 'A',
      active: false,
      documentNumber: '52998224725',
    };
    http.get.mockReturnValueOnce(of(mkResponse(customer)));
    const promise = client.findCustomerByDocument('52998224725');
    await jest.runAllTimersAsync();
    await expect(promise).resolves.toEqual(customer);
  });

  it('returns null on 404', async () => {
    const err: Partial<AxiosError> = {
      response: { status: 404 } as never,
      message: 'Not Found',
    };
    http.get.mockReturnValueOnce(throwError(() => err));
    const promise = client.findCustomerByDocument('52998224725');
    await jest.runAllTimersAsync();
    await expect(promise).resolves.toBeNull();
  });

  it('retries when first attempt times out and succeeds on second', async () => {
    const customer: CustomerDto = {
      id: 'c1',
      name: 'A',
      active: true,
      documentNumber: '52998224725',
    };
    const timeoutErr: Partial<AxiosError> = {
      code: 'ECONNABORTED',
      message: 'timeout',
    };
    http.get
      .mockReturnValueOnce(throwError(() => timeoutErr))
      .mockReturnValueOnce(of(mkResponse(customer)));
    const promise = client.findCustomerByDocument('52998224725');
    await jest.runAllTimersAsync();
    await expect(promise).resolves.toEqual(customer);
    expect(http.get).toHaveBeenCalledTimes(2);
  });

  it('throws OrderServiceUnavailableError after 4 failed attempts', async () => {
    const timeoutErr: Partial<AxiosError> = {
      code: 'ECONNABORTED',
      message: 'timeout',
    };
    http.get.mockReturnValue(throwError(() => timeoutErr));
    const promise = client
      .findCustomerByDocument('52998224725')
      .catch((e: unknown) => e);
    await jest.runAllTimersAsync();
    const result = await promise;
    expect(result).toBeInstanceOf(OrderServiceUnavailableError);
    expect(http.get).toHaveBeenCalledTimes(4);
  });

  it('logs each attempt with masked CPF', async () => {
    const timeoutErr: Partial<AxiosError> = {
      code: 'ECONNABORTED',
      message: 'timeout',
    };
    http.get.mockReturnValue(throwError(() => timeoutErr));
    const promise = client
      .findCustomerByDocument('52998224725')
      .catch((e: unknown) => e);
    await jest.runAllTimersAsync();
    const result = await promise;
    expect(result).toBeInstanceOf(OrderServiceUnavailableError);

    const allWarns = warnSpy.mock.calls.map((c) => String(c[0]));
    expect(allWarns.length).toBe(4);
    for (const log of allWarns) {
      expect(log).not.toContain('52998224725');
      expect(log).toContain('***.***.');
    }
  });
});
