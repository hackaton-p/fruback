import type { MigrationInterface, QueryRunner } from 'typeorm';

export class PackingV21791679847749 implements MigrationInterface {
  name = 'PackingV21791679847749';

  private async requireEmptyOperations(queryRunner: QueryRunner) {
    await queryRunner.query(
      'LOCK TABLE proyeccion, plan IN ACCESS EXCLUSIVE MODE',
    );
    const [row] = (await queryRunner.query(
      'SELECT EXISTS (SELECT 1 FROM proyeccion) OR EXISTS (SELECT 1 FROM plan) AS populated',
    )) as { populated: boolean }[];
    // Boxes and crates have no defined equivalence; never relabel operational data.
    if (row.populated)
      throw new Error(
        'Packing v2 changes fruit units. Archive existing projections/plans and use a fresh operational database with projections in crates; automatic conversion and destructive rollback are disabled.',
      );
  }

  async up(queryRunner: QueryRunner): Promise<void> {
    await this.requireEmptyOperations(queryRunner);
    await queryRunner.query(`DROP INDEX "idx_registro_avance_0"`);
    await queryRunner.query(
      `ALTER TABLE "proyeccion" RENAME COLUMN "cajas" TO "jabas"`,
    );
    await queryRunner.query(
      `ALTER TABLE "plan" RENAME COLUMN "parametrosSobrescritos" TO "parametrosModificados"`,
    );
    await queryRunner.query(
      `ALTER TABLE "plan_dia" RENAME COLUMN "cajasMeta" TO "jabasMeta"`,
    );
    await queryRunner.query(
      `ALTER TABLE "jornada" RENAME COLUMN "cajasRecibidas" TO "jabasRecibidas"`,
    );
    await queryRunner.query(
      `ALTER TABLE "jornada" RENAME COLUMN "cajasProcesadas" TO "jabasProcesadas"`,
    );
    await queryRunner.query(
      `ALTER TABLE "jornada" RENAME COLUMN "cajasDescarte" TO "jabasDescarte"`,
    );
    await queryRunner.query(
      `ALTER TABLE "registro_avance" RENAME COLUMN "cajasRecibidasAcum" TO "jabasRecibidasAcum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "registro_avance" RENAME COLUMN "cajasProcesadasAcum" TO "jabasProcesadasAcum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "plan_dia_area" ADD "trabajadoresLlegaron" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "plan_dia_area" ADD "trabajadoresInicio" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "jornada" ADD "horasEstimadasInicio" numeric(14,4)`,
    );
    await queryRunner.query(
      `ALTER TABLE "jornada" ADD "jabasEsperadasDia" numeric(14,4) NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "registro_avance" ADD "tipo" varchar(20) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "registro_avance" ADD "areaId" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "registro_avance" ADD "cambioPersonal" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "registro_avance" ADD "jabasEsperadasDia" numeric(14,4)`,
    );
    await queryRunner.query(
      `ALTER TABLE "registro_avance" ADD "horasEstimadas" numeric(14,4)`,
    );
    await queryRunner.query(
      `ALTER TABLE "registro_avance" ALTER COLUMN "jabasRecibidasAcum" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "registro_avance" ALTER COLUMN "jabasProcesadasAcum" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "plan_dia_area" ADD CONSTRAINT "ck_plan_day_area_start" CHECK ("trabajadoresLlegaron" >= 0 AND "trabajadoresInicio" >= 0 AND "trabajadoresInicio" <= "trabajadoresLlegaron")`,
    );
    await queryRunner.query(
      `ALTER TABLE "jornada" ADD CONSTRAINT "ck_workday_estimate" CHECK ("jabasEsperadasDia" >= 0 AND ("horasEstimadasInicio" IS NULL OR "horasEstimadasInicio" >= 0))`,
    );
    await queryRunner.query(
      `ALTER TABLE "registro_avance" ADD CONSTRAINT "ck_progress_estimate" CHECK ("horasEstimadas" IS NULL OR "horasEstimadas" >= 0)`,
    );
    await queryRunner.query(
      `ALTER TABLE "registro_avance" ADD CONSTRAINT "ck_progress_type" CHECK (("tipo" = 'AVANCE' AND "jabasRecibidasAcum" IS NOT NULL AND "jabasProcesadasAcum" IS NOT NULL AND "jabasProcesadasAcum" <= "jabasRecibidasAcum" AND "areaId" IS NULL AND "cambioPersonal" IS NULL AND "jabasEsperadasDia" IS NULL) OR ("tipo" = 'PERSONAL' AND "areaId" IS NOT NULL AND "cambioPersonal" IS NOT NULL AND "cambioPersonal" <> 0 AND "jabasRecibidasAcum" IS NULL AND "jabasProcesadasAcum" IS NULL AND "jabasEsperadasDia" IS NULL) OR ("tipo" = 'VOLUMEN' AND "jabasEsperadasDia" IS NOT NULL AND "jabasEsperadasDia" >= 0 AND "areaId" IS NULL AND "cambioPersonal" IS NULL AND "jabasRecibidasAcum" IS NULL AND "jabasProcesadasAcum" IS NULL))`,
    );
    await queryRunner.query(
      `ALTER TABLE "registro_avance" ADD CONSTRAINT "FK_b2f671589252bbe44446f00267e" FOREIGN KEY ("areaId") REFERENCES "area"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_registro_avance_0" ON "registro_avance" ("jornadaId", "hora")`,
    );
    await queryRunner.query(
      `UPDATE planta SET "rendimientoPersonaHora" = 5.9 WHERE nombre = 'Piura' AND "rendimientoPersonaHora" = 5`,
    );
    await queryRunner.query(
      `UPDATE planta SET "rendimientoPersonaHora" = 3.9 WHERE nombre = 'Sullana' AND "rendimientoPersonaHora" = 5.9`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await this.requireEmptyOperations(queryRunner);
    await queryRunner.query(`DROP INDEX "idx_registro_avance_0"`);
    await queryRunner.query(
      `ALTER TABLE "plan_dia_area" DROP CONSTRAINT "ck_plan_day_area_start"`,
    );
    await queryRunner.query(
      `ALTER TABLE "jornada" DROP CONSTRAINT "ck_workday_estimate"`,
    );
    await queryRunner.query(
      `ALTER TABLE "registro_avance" DROP CONSTRAINT "ck_progress_estimate"`,
    );
    await queryRunner.query(
      `ALTER TABLE "registro_avance" DROP CONSTRAINT "ck_progress_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "registro_avance" DROP CONSTRAINT "FK_b2f671589252bbe44446f00267e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "registro_avance" ALTER COLUMN "jabasRecibidasAcum" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "registro_avance" ALTER COLUMN "jabasProcesadasAcum" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "registro_avance" DROP COLUMN "horasEstimadas"`,
    );
    await queryRunner.query(
      `ALTER TABLE "registro_avance" DROP COLUMN "jabasEsperadasDia"`,
    );
    await queryRunner.query(
      `ALTER TABLE "registro_avance" DROP COLUMN "cambioPersonal"`,
    );
    await queryRunner.query(
      `ALTER TABLE "registro_avance" DROP COLUMN "areaId"`,
    );
    await queryRunner.query(`ALTER TABLE "registro_avance" DROP COLUMN "tipo"`);
    await queryRunner.query(
      `ALTER TABLE "jornada" DROP COLUMN "jabasEsperadasDia"`,
    );
    await queryRunner.query(
      `ALTER TABLE "jornada" DROP COLUMN "horasEstimadasInicio"`,
    );
    await queryRunner.query(
      `ALTER TABLE "plan_dia_area" DROP COLUMN "trabajadoresInicio"`,
    );
    await queryRunner.query(
      `ALTER TABLE "plan_dia_area" DROP COLUMN "trabajadoresLlegaron"`,
    );
    await queryRunner.query(
      `ALTER TABLE "registro_avance" RENAME COLUMN "jabasProcesadasAcum" TO "cajasProcesadasAcum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "registro_avance" RENAME COLUMN "jabasRecibidasAcum" TO "cajasRecibidasAcum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "jornada" RENAME COLUMN "jabasDescarte" TO "cajasDescarte"`,
    );
    await queryRunner.query(
      `ALTER TABLE "jornada" RENAME COLUMN "jabasProcesadas" TO "cajasProcesadas"`,
    );
    await queryRunner.query(
      `ALTER TABLE "jornada" RENAME COLUMN "jabasRecibidas" TO "cajasRecibidas"`,
    );
    await queryRunner.query(
      `ALTER TABLE "plan_dia" RENAME COLUMN "jabasMeta" TO "cajasMeta"`,
    );
    await queryRunner.query(
      `ALTER TABLE "plan" RENAME COLUMN "parametrosModificados" TO "parametrosSobrescritos"`,
    );
    await queryRunner.query(
      `ALTER TABLE "proyeccion" RENAME COLUMN "jabas" TO "cajas"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_registro_avance_0" ON "registro_avance" ("jornadaId", "hora")`,
    );
    await queryRunner.query(
      `UPDATE planta SET "rendimientoPersonaHora" = 5 WHERE nombre = 'Piura' AND "rendimientoPersonaHora" = 5.9`,
    );
    await queryRunner.query(
      `UPDATE planta SET "rendimientoPersonaHora" = 5.9 WHERE nombre = 'Sullana' AND "rendimientoPersonaHora" = 3.9`,
    );
  }
}
