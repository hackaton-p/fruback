import type { MigrationInterface, QueryRunner } from 'typeorm';

export class PlanCommercialSnapshot1791689000000 implements MigrationInterface {
  name = 'PlanCommercialSnapshot1791689000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Current projections cannot reconstruct historical commercial demand.
    await queryRunner.query(
      `ALTER TABLE "plan" ADD COLUMN "demandaComercialUsada" numeric(14,4)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const snapshots = (await queryRunner.query(
      `SELECT 1 FROM "plan" WHERE "demandaComercialUsada" IS NOT NULL LIMIT 1`,
    )) as unknown[];
    if (snapshots.length) {
      throw new Error(
        'Cannot remove saved commercial demand snapshots without losing plan history.',
      );
    }
    await queryRunner.query(
      `ALTER TABLE "plan" DROP COLUMN "demandaComercialUsada"`,
    );
  }
}
