import { HttpService } from '@nestjs/axios';
import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { firstValueFrom } from 'rxjs';
import { DataSource } from 'typeorm';

@ApiTags('health')
@Controller('health')
export class HealthController {
  private readonly orderServiceUrl: string;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly http: HttpService,
    config: ConfigService,
  ) {
    this.orderServiceUrl = config.getOrThrow<string>('ORDER_SERVICE_URL');
  }

  @Get()
  @ApiOperation({ summary: 'Liveness e dependências' })
  async check(): Promise<{
    status: 'ok' | 'degraded';
    postgres: 'connected' | 'error';
    orderService: 'reachable' | 'unreachable';
    timestamp: string;
  }> {
    const postgres = await this.checkPostgres();
    const orderService = await this.checkOrderService();
    const status: 'ok' | 'degraded' =
      postgres === 'connected' && orderService === 'reachable'
        ? 'ok'
        : 'degraded';
    return {
      status,
      postgres,
      orderService,
      timestamp: new Date().toISOString(),
    };
  }

  private async checkPostgres(): Promise<'connected' | 'error'> {
    try {
      await this.dataSource.query('SELECT 1');
      return 'connected';
    } catch {
      return 'error';
    }
  }

  private async checkOrderService(): Promise<'reachable' | 'unreachable'> {
    try {
      await firstValueFrom(
        this.http.get(`${this.orderServiceUrl}/health`, { timeout: 1000 }),
      );
      return 'reachable';
    } catch {
      return 'unreachable';
    }
  }
}
