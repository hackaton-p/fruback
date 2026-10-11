import type { MigrationInterface, QueryRunner } from 'typeorm';

export class MultipleWeeklyPlans1791682000000 implements MigrationInterface {
  name = 'MultipleWeeklyPlans1791682000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_plan_2"`);
    await queryRunner.query(`DROP INDEX "idx_plan_1"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_plan_1" ON "plan" ("plantaId", "frutaId", "anio", "semana") WHERE "estado" IN ('APROBADO', 'EN_EJECUCION', 'CERRADO')`,
    );
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_plan_2" ON "plan" ("plantaId", "frutaId", "anio", "semana") WHERE "estado" = 'BORRADOR'`,
    );
    await queryRunner.query(`DROP INDEX "idx_plan_1"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_plan_1" ON "plan" ("plantaId", "frutaId", "anio", "semana") WHERE "estado" IN ('APROBADO', 'EN_EJECUCION')`,
    );
  }
}
