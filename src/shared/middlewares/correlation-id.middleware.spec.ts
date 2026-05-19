import { NextFunction, Request, Response } from 'express';

import { CorrelationIdMiddleware } from './correlation-id.middleware';

describe('CorrelationIdMiddleware', () => {
  let middleware: CorrelationIdMiddleware;
  let req: Partial<Request>;
  let res: { setHeader: jest.Mock };
  let next: NextFunction;

  beforeEach(() => {
    middleware = new CorrelationIdMiddleware();
    req = { headers: {} };
    res = { setHeader: jest.fn() };
    next = jest.fn();
  });

  it('generates a UUID when no header is provided', () => {
    middleware.use(req as Request, res as unknown as Response, next);
    const generated = req.headers!['x-correlation-id'] as string;
    expect(generated).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(res.setHeader).toHaveBeenCalledWith('x-correlation-id', generated);
    expect(next).toHaveBeenCalled();
  });

  it('uses incoming x-correlation-id header', () => {
    req.headers = { 'x-correlation-id': 'incoming-id' };
    middleware.use(req as Request, res as unknown as Response, next);
    expect(req.headers['x-correlation-id']).toBe('incoming-id');
    expect(res.setHeader).toHaveBeenCalledWith(
      'x-correlation-id',
      'incoming-id',
    );
  });
});
