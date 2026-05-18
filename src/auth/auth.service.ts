import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { AdminService } from '../admin/admin.service';
import { OrderServiceClient } from '../external/order-service/order-service.client';
import { RequestContextService } from '../shared/logger/request-context.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { CustomerLoginDto } from './dto/customer-login.dto';
import { TokenResponseDto } from './dto/token-response.dto';

export interface JwtPayload {
  sub: string;
  role: 'CUSTOMER' | 'ADMIN';
  iat?: number;
  exp?: number;
}

const GENERIC_INVALID_CREDENTIALS = 'Credenciais inválidas';

function maskCpf(cpf: string): string {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length < 4) return '***';
  const tail = digits.slice(-4, -2);
  return `***.***.${tail}-**`;
}

function expiresInToSeconds(expiresIn: string): number {
  const match = /^(\d+)([smhd])?$/.exec(expiresIn.trim());
  if (!match) return 3600;
  const value = Number(match[1]);
  const unit = match[2] ?? 's';
  switch (unit) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 3600;
    case 'd':
      return value * 86400;
    default:
      return value;
  }
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly customerExpiresIn: string;
  private readonly adminExpiresIn: string;

  constructor(
    private readonly adminService: AdminService,
    private readonly orderClient: OrderServiceClient,
    private readonly jwt: JwtService,
    private readonly requestCtx: RequestContextService,
    config: ConfigService,
  ) {
    this.customerExpiresIn = config.getOrThrow<string>('JWT_CUSTOMER_EXPIRES_IN');
    this.adminExpiresIn = config.getOrThrow<string>('JWT_ADMIN_EXPIRES_IN');
  }

  async loginCustomer(dto: CustomerLoginDto): Promise<TokenResponseDto> {
    const normalized = dto.cpf.replace(/\D/g, '');
    if (!/^\d{11}$/.test(normalized)) {
      throw new BadRequestException('CPF inválido');
    }

    const masked = maskCpf(normalized);
    const customer = await this.orderClient.findCustomerByDocument(normalized);

    if (!customer) {
      this.logger.warn(`Customer login: not found ${masked}`);
      throw new UnauthorizedException('Cliente não encontrado');
    }
    if (!customer.active) {
      this.logger.warn(`Customer login: inactive ${masked}`);
      throw new UnauthorizedException('Cliente inativo');
    }

    const expiresIn = expiresInToSeconds(this.customerExpiresIn);
    const token = await this.jwt.signAsync(
      { sub: customer.id, role: 'CUSTOMER' as const },
      { expiresIn: this.customerExpiresIn as `${number}${'s' | 'm' | 'h' | 'd'}` },
    );

    this.requestCtx.set('user_id', customer.id);
    this.requestCtx.set('user_role', 'CUSTOMER');
    this.logger.log(`Customer login success for ${masked}`);
    return { token, expiresIn };
  }

  async loginAdmin(dto: AdminLoginDto): Promise<TokenResponseDto> {
    const admin = await this.adminService.findByEmail(dto.email);

    if (!admin || !admin.active) {
      this.logger.warn(`Admin login failed for ${dto.email}`);
      throw new UnauthorizedException(GENERIC_INVALID_CREDENTIALS);
    }

    const match = await bcrypt.compare(dto.password, admin.passwordHash);
    if (!match) {
      this.logger.warn(`Admin login failed for ${dto.email}`);
      throw new UnauthorizedException(GENERIC_INVALID_CREDENTIALS);
    }

    const expiresIn = expiresInToSeconds(this.adminExpiresIn);
    const token = await this.jwt.signAsync(
      { sub: admin.id, role: 'ADMIN' as const },
      { expiresIn: this.adminExpiresIn as `${number}${'s' | 'm' | 'h' | 'd'}` },
    );

    this.requestCtx.set('user_id', admin.id);
    this.requestCtx.set('user_role', 'ADMIN');
    this.logger.log(`Admin login success for ${admin.email}`);
    return { token, expiresIn };
  }

  async verifyToken(token: string): Promise<JwtPayload> {
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token);
      return payload;
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado');
    }
  }
}
