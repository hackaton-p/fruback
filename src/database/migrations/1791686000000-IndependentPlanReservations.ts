import type { MigrationInterface, QueryRunner } from 'typeorm';

export class IndependentPlanReservations1791686000000 implements MigrationInterface {
  name = 'IndependentPlanReservations1791686000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_plan_1"`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const conflicts = (await queryRunner.query(`
      SELECT 1 FROM "plan"
      WHERE "frutaId" IS NULL
        AND "estado" IN ('APROBADO', 'EN_EJECUCION', 'CERRADO')
      GROUP BY "plantaId", "anio", "semana"
      HAVING count(*) > 1 LIMIT 1
    `)) as unknown[];
    if (conflicts.length > 0) {
      throw new Error(
        'Cannot restore weekly uniqueness while multiple reserved plans exist for a plant and week. No plans were changed.',
      );
    }
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_plan_1" ON "plan" ("plantaId", "anio", "semana") WHERE "frutaId" IS NULL AND "estado" IN ('APROBADO', 'EN_EJECUCION', 'CERRADO')`,
    );
  }
}
