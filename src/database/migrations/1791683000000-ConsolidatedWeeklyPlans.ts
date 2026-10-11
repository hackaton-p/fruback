import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ConsolidatedWeeklyPlans1791683000000 implements MigrationInterface {
  name = 'ConsolidatedWeeklyPlans1791683000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "plan_dia" ADD COLUMN "jabasMetaPorFruta" jsonb NOT NULL DEFAULT '[]'::jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "jornada" ADD COLUMN "jabasProcesadasPorFruta" jsonb NOT NULL DEFAULT '[]'::jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "registro_avance" ADD COLUMN "jabasProcesadasPorFruta" jsonb`,
    );
    await queryRunner.query(
      `UPDATE "plan_dia" d SET "jabasMetaPorFruta" = jsonb_build_array(jsonb_build_object('fruitId', p."frutaId", 'fruitName', f."nombre", 'crates', d."jabasMeta")) FROM "plan" p JOIN "fruta" f ON f."id" = p."frutaId" WHERE p."id" = d."planId" AND p."frutaId" IS NOT NULL`,
    );
    await queryRunner.query(
      `UPDATE "jornada" w SET "jabasProcesadasPorFruta" = jsonb_build_array(jsonb_build_object('fruitId', p."frutaId", 'fruitName', f."nombre", 'crates', w."jabasProcesadas")) FROM "plan_dia" d JOIN "plan" p ON p."id" = d."planId" JOIN "fruta" f ON f."id" = p."frutaId" WHERE w."planDiaId" = d."id" AND p."frutaId" IS NOT NULL`,
    );
    await queryRunner.query(
      `UPDATE "registro_avance" r SET "jabasProcesadasPorFruta" = jsonb_build_array(jsonb_build_object('fruitId', p."frutaId", 'fruitName', f."nombre", 'crates', r."jabasProcesadasAcum")) FROM "jornada" w JOIN "plan_dia" d ON d."id" = w."planDiaId" JOIN "plan" p ON p."id" = d."planId" JOIN "fruta" f ON f."id" = p."frutaId" WHERE r."jornadaId" = w."id" AND r."tipo" = 'AVANCE' AND p."frutaId" IS NOT NULL`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_plan_1"`);
    await queryRunner.query(
      `ALTER TABLE "plan" ALTER COLUMN "frutaId" DROP NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_plan_1" ON "plan" ("plantaId", "anio", "semana") WHERE "frutaId" IS NULL AND "estado" IN ('APROBADO', 'EN_EJECUCION', 'CERRADO')`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const [row] = await queryRunner.query(
      `SELECT count(*)::int AS count FROM "plan" WHERE "frutaId" IS NULL`,
    );
    if (Number(row.count) > 0)
      throw new Error('Consolidated plans cannot be rolled back without losing their multi-fruit scope.');
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_plan_1"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_plan_1" ON "plan" ("plantaId", "frutaId", "anio", "semana") WHERE "estado" IN ('APROBADO', 'EN_EJECUCION', 'CERRADO')`,
    );
    await queryRunner.query(
      `ALTER TABLE "plan" ALTER COLUMN "frutaId" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "plan_dia" DROP COLUMN "jabasMetaPorFruta"`,
    );
    await queryRunner.query(`ALTER TABLE "registro_avance" DROP COLUMN "jabasProcesadasPorFruta"`);
    await queryRunner.query(`ALTER TABLE "jornada" DROP COLUMN "jabasProcesadasPorFruta"`);
  }
}
