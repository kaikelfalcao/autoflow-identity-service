import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { HealthController } from './health.controller';

@Module({
  imports: [HttpModule],
  controllers: [HealthController],
})
export class HealthModule {}
