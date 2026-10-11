import type { MigrationInterface, QueryRunner } from 'typeorm';

export class PlantConfigurationCompletion1791681000000 implements MigrationInterface {
  name = 'PlantConfigurationCompletion1791681000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "planta" ADD "configurationCompletedAt" TIMESTAMPTZ`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "planta" DROP COLUMN "configurationCompletedAt"`,
    );
  }
}
