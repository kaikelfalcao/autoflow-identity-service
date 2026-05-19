import { UnauthorizedException } from '@nestjs/common';

import { AuthController } from './auth.controller';
import { AuthService, JwtPayload } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    loginCustomer: jest.Mock;
    loginAdmin: jest.Mock;
    verifyToken: jest.Mock;
  };

  beforeEach(() => {
    authService = {
      loginCustomer: jest.fn(),
      loginAdmin: jest.fn(),
      verifyToken: jest.fn(),
    };
    controller = new AuthController(authService as unknown as AuthService);
  });

  it('delegates loginCustomer', async () => {
    authService.loginCustomer.mockResolvedValue({
      token: 't',
      expiresIn: 60,
    });
    await expect(
      controller.loginCustomer({ cpf: '52998224725' }),
    ).resolves.toEqual({ token: 't', expiresIn: 60 });
  });

  it('delegates loginAdmin', async () => {
    authService.loginAdmin.mockResolvedValue({ token: 't2', expiresIn: 120 });
    await expect(
      controller.loginAdmin({ email: 'a@b.c', password: 'x' }),
    ).resolves.toEqual({ token: 't2', expiresIn: 120 });
  });

  describe('verify', () => {
    it('returns claims for valid Bearer token', async () => {
      const payload: JwtPayload = { sub: 'u', role: 'ADMIN' };
      authService.verifyToken.mockResolvedValue(payload);
      await expect(controller.verify('Bearer abc.def.ghi')).resolves.toBe(
        payload,
      );
      expect(authService.verifyToken).toHaveBeenCalledWith('abc.def.ghi');
    });

    it('throws when authorization header is missing', async () => {
      await expect(controller.verify(undefined)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws when authorization header is not Bearer', async () => {
      await expect(controller.verify('Basic xyz')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
