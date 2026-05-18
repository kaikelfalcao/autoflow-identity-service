import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';

export interface CustomerDto {
  id: string;
  name: string;
  active: boolean;
  documentNumber: string;
}

export class OrderServiceUnavailableError extends Error {
  constructor(message = 'order-service unavailable') {
    super(message);
    this.name = 'OrderServiceUnavailableError';
  }
}

interface AttemptConfig {
  attempt: number;
  timeoutMs: number;
  delayBeforeMs: number;
}

const RETRY_PLAN: AttemptConfig[] = [
  { attempt: 1, timeoutMs: 2000, delayBeforeMs: 0 },
  { attempt: 2, timeoutMs: 4000, delayBeforeMs: 500 },
  { attempt: 3, timeoutMs: 10000, delayBeforeMs: 1000 },
  { attempt: 4, timeoutMs: 30000, delayBeforeMs: 2000 },
];

function maskDocument(doc: string): string {
  const digits = doc.replace(/\D/g, '');
  if (digits.length < 4) return '***';
  const tail = digits.slice(-4, -2);
  return `***.***.${tail}-**`;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Injectable()
export class OrderServiceClient {
  private readonly logger = new Logger(OrderServiceClient.name);
  private readonly baseUrl: string;

  constructor(
    private readonly http: HttpService,
    config: ConfigService,
  ) {
    this.baseUrl = config.getOrThrow<string>('ORDER_SERVICE_URL');
  }

  async findCustomerByDocument(
    documentNumber: string,
  ): Promise<CustomerDto | null> {
    const masked = maskDocument(documentNumber);
    const url = `${this.baseUrl}/customers/by-document/${encodeURIComponent(documentNumber)}`;

    let lastError: unknown;

    for (const cfg of RETRY_PLAN) {
      if (cfg.delayBeforeMs > 0) {
        await delay(cfg.delayBeforeMs);
      }

      try {
        const response = await firstValueFrom(
          this.http.get<CustomerDto>(url, { timeout: cfg.timeoutMs }),
        );
        this.logger.log(
          `findCustomerByDocument success on attempt ${cfg.attempt} for ${masked}`,
        );
        return response.data;
      } catch (err) {
        const axiosErr = err as AxiosError;
        const status = axiosErr.response?.status;

        if (status === 404) {
          this.logger.log(
            `findCustomerByDocument 404 for ${masked} (attempt ${cfg.attempt})`,
          );
          return null;
        }

        lastError = err;
        this.logger.warn(
          `findCustomerByDocument attempt ${cfg.attempt} failed for ${masked}: ` +
            `timeout=${cfg.timeoutMs}ms, status=${status ?? 'NETWORK'}, msg=${axiosErr.message}`,
        );
      }
    }

    this.logger.error(
      `findCustomerByDocument exhausted ${RETRY_PLAN.length} attempts for ${masked}`,
      (lastError as Error)?.stack,
    );
    throw new OrderServiceUnavailableError(
      `order-service unreachable after ${RETRY_PLAN.length} attempts`,
    );
  }
}
