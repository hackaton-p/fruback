import { MigrationInterface, QueryRunner } from 'typeorm';

export class BetterAuthProfile1791676377682 implements MigrationInterface {
  name = 'BetterAuthProfile1791676377682';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`create table "auth_user" ("id" text not null primary key, "name" text not null, "email" text not null unique, "emailVerified" boolean not null, "image" text, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz default CURRENT_TIMESTAMP not null);

create table "auth_session" ("id" text not null primary key, "expiresAt" timestamptz not null, "token" text not null unique, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz not null, "ipAddress" text, "userAgent" text, "userId" text not null references "auth_user" ("id") on delete cascade);

create table "auth_account" ("id" text not null primary key, "accountId" text not null, "providerId" text not null, "userId" text not null references "auth_user" ("id") on delete cascade, "accessToken" text, "refreshToken" text, "idToken" text, "accessTokenExpiresAt" timestamptz, "refreshTokenExpiresAt" timestamptz, "scope" text, "password" text, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz not null);

create table "auth_verification" ("id" text not null primary key, "identifier" text not null, "value" text not null, "expiresAt" timestamptz not null, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz default CURRENT_TIMESTAMP not null);

create table "auth_rate_limit" ("id" text not null primary key, "key" text not null unique, "count" integer not null, "lastRequest" bigint not null);

create index "auth_session_userId_idx" on "auth_session" ("userId");

create index "auth_account_userId_idx" on "auth_account" ("userId");

create index "auth_verification_identifier_idx" on "auth_verification" ("identifier");`);
    await queryRunner.query(`ALTER TABLE "usuario" ADD "authUserId" text`);
    await queryRunner.query(
      `ALTER TABLE "usuario" ADD CONSTRAINT "UQ_6e64cfeab1de2df9639560347f6" UNIQUE ("authUserId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuario" ALTER COLUMN "passwordHash" DROP NOT NULL`,
    );
    await queryRunner.query(
      `INSERT INTO auth_user (id, name, email, "emailVerified", "createdAt", "updatedAt") SELECT 'packing-' || id, nombre, lower(email), false, "createdAt", "updatedAt" FROM usuario WHERE "passwordHash" IS NOT NULL`,
    );
    await queryRunner.query(
      `UPDATE usuario SET "authUserId" = 'packing-' || id WHERE "passwordHash" IS NOT NULL`,
    );
    await queryRunner.query(
      `INSERT INTO auth_account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt") SELECT 'packing-credential-' || id, "authUserId", 'credential', "authUserId", "passwordHash", "createdAt", "updatedAt" FROM usuario WHERE "authUserId" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE usuario AS profile SET "passwordHash" = account.password FROM auth_account AS account WHERE profile."authUserId" = account."userId" AND account."providerId" = 'credential' AND account.password IS NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuario" ALTER COLUMN "passwordHash" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuario" DROP CONSTRAINT "UQ_6e64cfeab1de2df9639560347f6"`,
    );
    await queryRunner.query(`ALTER TABLE "usuario" DROP COLUMN "authUserId"`);
    await queryRunner.query(
      `DROP TABLE "auth_rate_limit", "auth_verification", "auth_account", "auth_session", "auth_user"`,
    );
  }
}
