import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuthSessions1766160001000 implements MigrationInterface {
  name = 'CreateAuthSessions1766160001000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
  `CREATE TABLE "auth_session" ("id" character varying(26) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "version" integer NOT NULL DEFAULT 1, "account_id" character varying(26) NOT NULL, "access_version" integer NOT NULL DEFAULT 1, "csrf_token_hash" character varying(64) NOT NULL, "last_used_at" TIMESTAMP WITH TIME ZONE NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "revoked_at" TIMESTAMP WITH TIME ZONE, "revocation_reason" character varying(64), CONSTRAINT "PK_auth_session_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_auth_session_account_id" ON "auth_session" ("account_id")`,
    );
    await queryRunner.query(
  `CREATE TABLE "auth_refresh_token" ("id" character varying(26) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "version" integer NOT NULL DEFAULT 1, "session_id" character varying(26) NOT NULL, "token_hash" character varying(64) NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "consumed_at" TIMESTAMP WITH TIME ZONE, "revoked_at" TIMESTAMP WITH TIME ZONE, "replaced_by_id" character varying(26), "parent_id" character varying(26), CONSTRAINT "PK_auth_refresh_token_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_auth_refresh_token_hash" ON "auth_refresh_token" ("token_hash")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_auth_refresh_token_session_id" ON "auth_refresh_token" ("session_id")`,
    );
    await queryRunner.query(
     `ALTER TABLE "auth_session" ADD CONSTRAINT "FK_auth_session_account" FOREIGN KEY ("account_id") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
    );
    await queryRunner.query(
    `ALTER TABLE "auth_refresh_token" ADD CONSTRAINT "FK_auth_refresh_token_session" FOREIGN KEY ("session_id") REFERENCES "auth_session"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "auth_refresh_token" DROP CONSTRAINT "FK_auth_refresh_token_session"`,
    );
    await queryRunner.query(
      `ALTER TABLE "auth_session" DROP CONSTRAINT "FK_auth_session_account"`,
    );
    await queryRunner.query(`DROP INDEX "idx_auth_refresh_token_session_id"`);
    await queryRunner.query(`DROP INDEX "uq_auth_refresh_token_hash"`);
    await queryRunner.query(`DROP TABLE "auth_refresh_token"`);
    await queryRunner.query(`DROP INDEX "idx_auth_session_account_id"`);
    await queryRunner.query(`DROP TABLE "auth_session"`);
  }
}
