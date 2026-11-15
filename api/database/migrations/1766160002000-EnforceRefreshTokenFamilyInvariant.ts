import type { MigrationInterface, QueryRunner } from 'typeorm';

export class EnforceRefreshTokenFamilyInvariant1766160002000 implements MigrationInterface {
  name = 'EnforceRefreshTokenFamilyInvariant1766160002000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_auth_refresh_token_parent_id" ON "auth_refresh_token" ("parent_id")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "uq_auth_refresh_token_parent_id"`);
  }
}
