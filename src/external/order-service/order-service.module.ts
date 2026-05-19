import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { OrderServiceClient } from './order-service.client';

@Module({
  imports: [HttpModule],
  providers: [OrderServiceClient],
  exports: [OrderServiceClient],
})
export class OrderServiceModule {}
