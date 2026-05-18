import { plainToInstance } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
  validateSync,
} from 'class-validator';

export class EnvConfig {
  @IsOptional()
  @IsString()
  NODE_ENV: string = 'development';

  @IsOptional()
  @IsString()
  LOG_LEVEL: string = 'info';

  @IsOptional()
  @IsInt()
  PORT: number = 3000;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  @MinLength(32, { message: 'JWT_SECRET must be at least 32 characters long' })
  JWT_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  JWT_CUSTOMER_EXPIRES_IN!: string;

  @IsString()
  @IsNotEmpty()
  JWT_ADMIN_EXPIRES_IN!: string;

  @IsUrl({ require_tld: false, require_protocol: true })
  ORDER_SERVICE_URL!: string;

  @IsInt()
  ORDER_SERVICE_TIMEOUT_MS!: number;

  @IsOptional()
  @IsString()
  CORRELATION_ID_HEADER: string = 'x-correlation-id';
}

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const coerced = {
    ...config,
    PORT: config.PORT ? Number(config.PORT) : undefined,
    ORDER_SERVICE_TIMEOUT_MS: config.ORDER_SERVICE_TIMEOUT_MS
      ? Number(config.ORDER_SERVICE_TIMEOUT_MS)
      : undefined,
  };
  const validated = plainToInstance(EnvConfig, coerced, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    const messages = errors
      .map((e) => `${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`)
      .join('\n');
    throw new Error(`Environment validation failed:\n${messages}`);
  }
  return validated;
}
