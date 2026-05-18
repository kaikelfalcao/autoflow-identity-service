import {
  ArgumentsHost,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';

import { OrderServiceUnavailableError } from '../../external/order-service/order-service.client';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let response: { status: jest.Mock; json: jest.Mock };
  let request: { url: string; headers: Record<string, string> };
  let host: Partial<ArgumentsHost>;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    request = { url: '/auth/login', headers: { 'x-correlation-id': 'cid-1' } };
    host = {
      switchToHttp: () =>
        ({
          getResponse: () => response,
          getRequest: () => request,
        }) as never,
    };
  });

  it('maps UnauthorizedException to 401', () => {
    filter.catch(new UnauthorizedException('nope'), host as ArgumentsHost);
    expect(response.status).toHaveBeenCalledWith(401);
  });

  it('maps BadRequestException to 400', () => {
    filter.catch(new BadRequestException('bad'), host as ArgumentsHost);
    expect(response.status).toHaveBeenCalledWith(400);
  });

  it('maps OrderServiceUnavailableError to 503', () => {
    filter.catch(
      new OrderServiceUnavailableError(),
      host as ArgumentsHost,
    );
    expect(response.status).toHaveBeenCalledWith(503);
  });

  it('maps unknown errors to 500 and logs', () => {
    filter.catch(new Error('boom'), host as ArgumentsHost);
    expect(response.status).toHaveBeenCalledWith(500);
  });

  it('includes correlationId in response body', () => {
    filter.catch(new UnauthorizedException(), host as ArgumentsHost);
    const body = response.json.mock.calls[0][0];
    expect(body.correlationId).toBe('cid-1');
    expect(body.path).toBe('/auth/login');
    expect(body.statusCode).toBe(401);
  });
});
