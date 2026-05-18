import 'dotenv/config';
import { DataSource } from 'typeorm';

import { Admin } from '../admin/entities/admin.entity';

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/identity',
  entities: [Admin],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
});
