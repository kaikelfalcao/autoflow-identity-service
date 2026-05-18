import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

import { AuthService } from '../../auth/auth.service';
import { JwtGuard } from './jwt.guard';

describe('JwtGuard', () => {
  let guard: JwtGuard;
  let authService: { verifyToken: jest.Mock };

  const mkContext = (headers: Record<string, string>): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ headers }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    authService = { verifyToken: jest.fn() };
    guard = new JwtGuard(authService as unknown as AuthService);
  });

  it('passes with valid Bearer token', async () => {
    authService.verifyToken.mockResolvedValue({ sub: 'u', role: 'ADMIN' });
    await expect(
      guard.canActivate(mkContext({ authorization: 'Bearer abc' })),
    ).resolves.toBe(true);
  });

  it('rejects when authorization header is missing', async () => {
    await expect(guard.canActivate(mkContext({}))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects non-Bearer scheme', async () => {
    await expect(
      guard.canActivate(mkContext({ authorization: 'Basic xx' })),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('propagates Unauthorized from verifyToken', async () => {
    authService.verifyToken.mockRejectedValue(new UnauthorizedException());
    await expect(
      guard.canActivate(mkContext({ authorization: 'Bearer bad' })),
    ).rejects.toThrow(UnauthorizedException);
  });
});
