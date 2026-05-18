import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));
import * as bcrypt from 'bcrypt';

import { AdminService } from '../admin/admin.service';
import { Admin } from '../admin/entities/admin.entity';
import {
  OrderServiceClient,
  OrderServiceUnavailableError,
} from '../external/order-service/order-service.client';
import { RequestContextService } from '../shared/logger/request-context.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let adminService: { findByEmail: jest.Mock; findById: jest.Mock };
  let orderClient: { findCustomerByDocument: jest.Mock };
  let jwt: { signAsync: jest.Mock; verifyAsync: jest.Mock };
  let config: { getOrThrow: jest.Mock };

  beforeEach(() => {
    adminService = { findByEmail: jest.fn(), findById: jest.fn() };
    orderClient = { findCustomerByDocument: jest.fn() };
    jwt = {
      signAsync: jest.fn().mockResolvedValue('signed.jwt.token'),
      verifyAsync: jest.fn(),
    };
    config = {
      getOrThrow: jest.fn((key: string) => {
        if (key === 'JWT_CUSTOMER_EXPIRES_IN') return '1h';
        if (key === 'JWT_ADMIN_EXPIRES_IN') return '8h';
        return '';
      }),
    };
    const requestCtx = new RequestContextService();
    requestCtx.enter({});
    service = new AuthService(
      adminService as unknown as AdminService,
      orderClient as unknown as OrderServiceClient,
      jwt as unknown as JwtService,
      requestCtx,
      config as unknown as ConfigService,
    );
  });

  describe('loginCustomer', () => {
    it('returns token for active customer', async () => {
      orderClient.findCustomerByDocument.mockResolvedValue({
        id: 'cust-1',
        name: 'Joe',
        active: true,
        documentNumber: '52998224725',
      });
      const result = await service.loginCustomer({ cpf: '529.982.247-25' });
      expect(result).toEqual({ token: 'signed.jwt.token', expiresIn: 3600 });
      expect(orderClient.findCustomerByDocument).toHaveBeenCalledWith('52998224725');
      expect(jwt.signAsync).toHaveBeenCalledWith(
        { sub: 'cust-1', role: 'CUSTOMER' },
        expect.objectContaining({ expiresIn: '1h' }),
      );
    });

    it('normalizes CPF without formatting', async () => {
      orderClient.findCustomerByDocument.mockResolvedValue({
        id: 'c',
        name: 'x',
        active: true,
        documentNumber: '52998224725',
      });
      await service.loginCustomer({ cpf: '52998224725' });
      expect(orderClient.findCustomerByDocument).toHaveBeenCalledWith('52998224725');
    });

    it('throws BadRequest for malformed CPF', async () => {
      await expect(service.loginCustomer({ cpf: '123' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws Unauthorized when customer not found', async () => {
      orderClient.findCustomerByDocument.mockResolvedValue(null);
      await expect(
        service.loginCustomer({ cpf: '52998224725' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws Unauthorized when customer is inactive', async () => {
      orderClient.findCustomerByDocument.mockResolvedValue({
        id: 'c',
        name: 'x',
        active: false,
        documentNumber: '52998224725',
      });
      await expect(
        service.loginCustomer({ cpf: '52998224725' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('propagates OrderServiceUnavailableError', async () => {
      orderClient.findCustomerByDocument.mockRejectedValue(
        new OrderServiceUnavailableError(),
      );
      await expect(
        service.loginCustomer({ cpf: '52998224725' }),
      ).rejects.toThrow(OrderServiceUnavailableError);
    });
  });

  describe('loginAdmin', () => {
    const buildAdmin = (overrides?: Partial<Admin>): Admin =>
      ({
        id: 'a1',
        email: 'admin@x.com',
        passwordHash: 'hash',
        name: 'Adm',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
      }) as Admin;

    it('returns token for valid credentials', async () => {
      const admin = buildAdmin();
      adminService.findByEmail.mockResolvedValue(admin);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      const result = await service.loginAdmin({
        email: 'admin@x.com',
        password: 'Pwd!',
      });
      expect(result.token).toBe('signed.jwt.token');
      expect(result.expiresIn).toBe(8 * 3600);
    });

    it('uses generic message when admin not found', async () => {
      adminService.findByEmail.mockResolvedValue(null);
      await expect(
        service.loginAdmin({ email: 'x@x.com', password: 'p' }),
      ).rejects.toThrow(new UnauthorizedException('Credenciais inválidas'));
    });

    it('uses generic message when password mismatch', async () => {
      adminService.findByEmail.mockResolvedValue(buildAdmin());
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(
        service.loginAdmin({ email: 'admin@x.com', password: 'bad' }),
      ).rejects.toThrow(new UnauthorizedException('Credenciais inválidas'));
    });

    it('uses generic message when admin inactive', async () => {
      adminService.findByEmail.mockResolvedValue(buildAdmin({ active: false }));
      await expect(
        service.loginAdmin({ email: 'admin@x.com', password: 'p' }),
      ).rejects.toThrow(new UnauthorizedException('Credenciais inválidas'));
    });
  });

  describe('expiresIn parsing', () => {
    const mkServiceWith = (customerExp: string, adminExp: string) => {
      const cfg = {
        getOrThrow: jest.fn((key: string) => {
          if (key === 'JWT_CUSTOMER_EXPIRES_IN') return customerExp;
          if (key === 'JWT_ADMIN_EXPIRES_IN') return adminExp;
          return '';
        }),
      };
      const ctx = new RequestContextService();
      ctx.enter({});
      return new AuthService(
        adminService as unknown as AdminService,
        orderClient as unknown as OrderServiceClient,
        jwt as unknown as JwtService,
        ctx,
        cfg as unknown as ConfigService,
      );
    };

    it('parses seconds suffix', async () => {
      const s = mkServiceWith('30s', '8h');
      orderClient.findCustomerByDocument.mockResolvedValue({
        id: 'c',
        name: 'x',
        active: true,
        documentNumber: '52998224725',
      });
      const result = await s.loginCustomer({ cpf: '52998224725' });
      expect(result.expiresIn).toBe(30);
    });

    it('parses days suffix', async () => {
      const s = mkServiceWith('2d', '8h');
      orderClient.findCustomerByDocument.mockResolvedValue({
        id: 'c',
        name: 'x',
        active: true,
        documentNumber: '52998224725',
      });
      const result = await s.loginCustomer({ cpf: '52998224725' });
      expect(result.expiresIn).toBe(2 * 86400);
    });

    it('parses minutes suffix', async () => {
      const s = mkServiceWith('45m', '8h');
      orderClient.findCustomerByDocument.mockResolvedValue({
        id: 'c',
        name: 'x',
        active: true,
        documentNumber: '52998224725',
      });
      const result = await s.loginCustomer({ cpf: '52998224725' });
      expect(result.expiresIn).toBe(45 * 60);
    });

    it('falls back to default for malformed config', async () => {
      const s = mkServiceWith('invalid', '8h');
      orderClient.findCustomerByDocument.mockResolvedValue({
        id: 'c',
        name: 'x',
        active: true,
        documentNumber: '52998224725',
      });
      const result = await s.loginCustomer({ cpf: '52998224725' });
      expect(result.expiresIn).toBe(3600);
    });

    it('parses bare numeric as seconds', async () => {
      const s = mkServiceWith('120', '8h');
      orderClient.findCustomerByDocument.mockResolvedValue({
        id: 'c',
        name: 'x',
        active: true,
        documentNumber: '52998224725',
      });
      const result = await s.loginCustomer({ cpf: '52998224725' });
      expect(result.expiresIn).toBe(120);
    });
  });

  describe('verifyToken', () => {
    it('returns payload for valid token', async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: 'a', role: 'ADMIN' });
      await expect(service.verifyToken('tok')).resolves.toEqual({
        sub: 'a',
        role: 'ADMIN',
      });
    });

    it('throws Unauthorized for invalid token', async () => {
      jwt.verifyAsync.mockRejectedValue(new Error('invalid'));
      await expect(service.verifyToken('bad')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws Unauthorized for malformed token', async () => {
      jwt.verifyAsync.mockRejectedValue(new Error('malformed'));
      await expect(service.verifyToken('not-a-jwt')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
