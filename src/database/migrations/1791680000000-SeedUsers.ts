import type { MigrationInterface, QueryRunner } from 'typeorm';

const PASSWORD_HASH =
  '$2b$10$64CV5qJbz88coQbkeVARMOP3JxQfAqFudfo3DzAPFZwi9HYWhXRCa';

export class SeedUsers1791680000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ADMIN was added to earlier migrations after some databases had already run them.
    await queryRunner.query(`ALTER TABLE "rol" DROP CONSTRAINT IF EXISTS "ck_rol_0"`);
    await queryRunner.query(
      `ALTER TABLE "rol" ADD CONSTRAINT "ck_rol_0" CHECK ("nombre" IN ('ADMIN', 'PLANIFICADOR', 'SUBGERENTE', 'JEFE_TURNO'))`,
    );
    await queryRunner.query(
      `INSERT INTO "rol" (nombre) VALUES ('ADMIN') ON CONFLICT DO NOTHING`,
    );

    await queryRunner.query(`
      INSERT INTO "auth_user" (id, name, email, "emailVerified", image, "createdAt", "updatedAt")
      VALUES
        ('admin-user', 'Admin', 'admin@example.com', true, null, NOW(), NOW()),
        ('subgerente-user', 'Subgerente', 'subgerente@example.com', true, null, NOW(), NOW()),
        ('planificador-user', 'Planificador Piura', 'planificador@piura.com', true, null, NOW(), NOW()),
        ('jefe-turno-user', 'Jefe de Turno Piura', 'jefe.turno@piura.com', true, null, NOW(), NOW())
      ON CONFLICT DO NOTHING
    `);

    // A user with the same email may already exist under a different id, so resolve the real id by email.
    await queryRunner.query(`
      INSERT INTO "auth_account" (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
      SELECT a.id, au.id, 'credential', au.id, '${PASSWORD_HASH}', NOW(), NOW()
      FROM (VALUES
        ('admin-account', 'admin@example.com'),
        ('subgerente-account', 'subgerente@example.com'),
        ('planificador-account', 'planificador@piura.com'),
        ('jefe-turno-account', 'jefe.turno@piura.com')
      ) AS a(id, email)
      JOIN "auth_user" au ON au.email = a.email
      ON CONFLICT DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO "usuario" ("rolId", "plantaId", nombre, email, "authUserId", "createdAt", "updatedAt")
      SELECT
        (SELECT id FROM "rol" WHERE nombre = u.rol),
        CASE WHEN u.planta IS NOT NULL THEN (SELECT id FROM "planta" WHERE nombre = u.planta) ELSE NULL END,
        u.nombre,
        u.email,
        au.id,
        NOW(),
        NOW()
      FROM (VALUES
        ('ADMIN', NULL, 'Admin', 'admin@example.com'),
        ('SUBGERENTE', NULL, 'Subgerente', 'subgerente@example.com'),
        ('PLANIFICADOR', 'Piura', 'Planificador Piura', 'planificador@piura.com'),
        ('JEFE_TURNO', 'Piura', 'Jefe de Turno Piura', 'jefe.turno@piura.com')
      ) AS u(rol, planta, nombre, email)
      JOIN "auth_user" au ON au.email = u.email
      ON CONFLICT DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "usuario" WHERE email IN (
        'admin@example.com',
        'subgerente@example.com',
        'planificador@piura.com',
        'jefe.turno@piura.com'
      )
    `);
    await queryRunner.query(`
      DELETE FROM "auth_account" WHERE "userId" IN (
        'admin-user',
        'subgerente-user',
        'planificador-user',
        'jefe-turno-user'
      )
    `);
    await queryRunner.query(`
      DELETE FROM "auth_user" WHERE id IN (
        'admin-user',
        'subgerente-user',
        'planificador-user',
        'jefe-turno-user'
      )
    `);
  }
}
