import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAdmins1700000000001 implements MigrationInterface {
  name = 'CreateAdmins1700000000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email         VARCHAR(255) NOT NULL,
        name          VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        active        BOOLEAN NOT NULL DEFAULT true,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT admins_email_unique UNIQUE (email)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_admins_email ON admins (email)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_admins_email`);
    await queryRunner.query(`DROP TABLE IF EXISTS admins`);
  }
}
