import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuthenticationTables1766160000000 implements MigrationInterface {
  name = 'CreateAuthenticationTables1766160000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "account_status_enum" AS ENUM ('ACTIVE', 'LOCKED', 'DISABLED', 'PENDING_DELETION', 'ANONYMIZED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "auth_identifier_type_enum" AS ENUM ('EMAIL')`,
    );
    await queryRunner.query(
  `CREATE TABLE "account" ("id" character varying(26) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "version" integer NOT NULL DEFAULT 1, "status" "account_status_enum" NOT NULL DEFAULT 'ACTIVE', "anonymized_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_account_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
  `CREATE TABLE "auth_identifier" ("id" character varying(26) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "version" integer NOT NULL DEFAULT 1, "account_id" character varying(26) NOT NULL, "type" "auth_identifier_type_enum" NOT NULL, "value" character varying(320) NOT NULL, "verified_at" TIMESTAMP WITH TIME ZONE, "is_primary" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_auth_identifier_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_auth_identifier_type_value" ON "auth_identifier" ("type", "value")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_auth_identifier_account_id" ON "auth_identifier" ("account_id")`,
    );
    await queryRunner.query(
  `CREATE TABLE "password_credential" ("id" character varying(26) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "version" integer NOT NULL DEFAULT 1, "account_id" character varying(26) NOT NULL, "password_hash" text NOT NULL, "hash_version" character varying(32) NOT NULL, "failed_attempts" integer NOT NULL DEFAULT 0, "locked_until" TIMESTAMP WITH TIME ZONE, "last_failed_at" TIMESTAMP WITH TIME ZONE, "last_used_at" TIMESTAMP WITH TIME ZONE, "changed_at" TIMESTAMP WITH TIME ZONE NOT NULL, "disabled_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_password_credential_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_password_credential_account_id" ON "password_credential" ("account_id")`,
    );
    await queryRunner.query(
     `ALTER TABLE "auth_identifier" ADD CONSTRAINT "FK_auth_identifier_account" FOREIGN KEY ("account_id") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
    );
    await queryRunner.query(
    `ALTER TABLE "password_credential" ADD CONSTRAINT "FK_password_credential_account" FOREIGN KEY ("account_id") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "password_credential" DROP CONSTRAINT "FK_password_credential_account"`,
    );
    await queryRunner.query(
      `ALTER TABLE "auth_identifier" DROP CONSTRAINT "FK_auth_identifier_account"`,
    );
    await queryRunner.query(`DROP INDEX "uq_password_credential_account_id"`);
    await queryRunner.query(`DROP TABLE "password_credential"`);
    await queryRunner.query(`DROP INDEX "idx_auth_identifier_account_id"`);
    await queryRunner.query(`DROP INDEX "uq_auth_identifier_type_value"`);
    await queryRunner.query(`DROP TABLE "auth_identifier"`);
    await queryRunner.query(`DROP TABLE "account"`);
    await queryRunner.query(`DROP TYPE "auth_identifier_type_enum"`);
    await queryRunner.query(`DROP TYPE "account_status_enum"`);
  }
}
