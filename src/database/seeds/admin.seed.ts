import 'dotenv/config';
import * as bcrypt from 'bcrypt';

import dataSource from '../typeorm.datasource';
import { Admin } from '../../admin/entities/admin.entity';

const BCRYPT_COST = 12;

async function run(): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME ?? 'Administrador';

  if (!email || !password) {
    throw new Error(
      'SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in environment',
    );
  }

  await dataSource.initialize();
  const repo = dataSource.getRepository(Admin);

  const existing = await repo.findOne({ where: { email } });
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

  if (existing) {
    existing.passwordHash = passwordHash;
    existing.name = name;
    existing.active = true;
    await repo.save(existing);
    process.stdout.write(`Admin ${email} updated\n`);
  } else {
    await repo.save(repo.create({ email, name, passwordHash, active: true }));
    process.stdout.write(`Admin ${email} created\n`);
  }

  await dataSource.destroy();
}

run().catch((err: unknown) => {
  process.stderr.write(`Seed failed: ${(err as Error).message}\n`);
  process.exit(1);
});
