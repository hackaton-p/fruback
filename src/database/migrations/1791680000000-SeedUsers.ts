import type { MigrationInterface, QueryRunner } from 'typeorm';

const PASSWORD_HASH =
  '$2b$10$64CV5qJbz88coQbkeVARMOP3JxQfAqFudfo3DzAPFZwi9HYWhXRCa';

export class SeedUsers1791680000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "auth_user" (id, name, email, "emailVerified", image, "createdAt", "updatedAt")
      VALUES
        ('admin-user', 'Admin', 'admin@example.com', true, null, NOW(), NOW()),
        ('subgerente-user', 'Subgerente', 'subgerente@example.com', true, null, NOW(), NOW()),
        ('planificador-user', 'Planificador Piura', 'planificador@piura.com', true, null, NOW(), NOW()),
        ('jefe-turno-user', 'Jefe de Turno Piura', 'jefe.turno@piura.com', true, null, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO "auth_account" (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
      VALUES
        ('admin-account', 'admin-user', 'credential', 'admin-user', '${PASSWORD_HASH}', NOW(), NOW()),
        ('subgerente-account', 'subgerente-user', 'credential', 'subgerente-user', '${PASSWORD_HASH}', NOW(), NOW()),
        ('planificador-account', 'planificador-user', 'credential', 'planificador-user', '${PASSWORD_HASH}', NOW(), NOW()),
        ('jefe-turno-account', 'jefe-turno-user', 'credential', 'jefe-turno-user', '${PASSWORD_HASH}', NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO "usuario" ("rolId", "plantaId", nombre, email, "authUserId", "createdAt", "updatedAt")
      SELECT
        (SELECT id FROM "rol" WHERE nombre = u.rol),
        CASE WHEN u.planta IS NOT NULL THEN (SELECT id FROM "planta" WHERE nombre = u.planta) ELSE NULL END,
        u.nombre,
        u.email,
        u.auth_user_id,
        NOW(),
        NOW()
      FROM (VALUES
        ('ADMIN', NULL, 'Admin', 'admin@example.com', 'admin-user'),
        ('SUBGERENTE', NULL, 'Subgerente', 'subgerente@example.com', 'subgerente-user'),
        ('PLANIFICADOR', 'Piura', 'Planificador Piura', 'planificador@piura.com', 'planificador-user'),
        ('JEFE_TURNO', 'Piura', 'Jefe de Turno Piura', 'jefe.turno@piura.com', 'jefe-turno-user')
      ) AS u(rol, planta, nombre, email, auth_user_id)
      ON CONFLICT (email) DO NOTHING
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
