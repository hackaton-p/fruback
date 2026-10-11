import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CatalogLogicalDeletion1791685000000 implements MigrationInterface {
  name = 'CatalogLogicalDeletion1791685000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "planta" ADD COLUMN "activo" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "fruta" ADD COLUMN "activo" boolean NOT NULL DEFAULT true`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "fruta" DROP COLUMN "activo"`);
    await queryRunner.query(`ALTER TABLE "planta" DROP COLUMN "activo"`);
  }
}
