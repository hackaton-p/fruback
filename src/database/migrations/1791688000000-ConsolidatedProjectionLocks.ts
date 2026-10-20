import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ConsolidatedProjectionLocks1791688000000 implements MigrationInterface {
  name = 'ConsolidatedProjectionLocks1791688000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await this.replaceFunction(
      queryRunner,
      '("frutaId" IS NULL OR "frutaId" = OLD."frutaId")',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await this.replaceFunction(queryRunner, '"frutaId" = OLD."frutaId"');
  }

  private async replaceFunction(
    queryRunner: QueryRunner,
    fruitScope: string,
  ): Promise<void> {
    await queryRunner.query(`CREATE OR REPLACE FUNCTION prevent_locked_projection_delete() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM plan WHERE "plantaId" = OLD."plantaId"
            AND ${fruitScope} AND "anio" = OLD."anio" AND "semana" = OLD."semana"
            AND "estado" NOT IN ('BORRADOR', 'RECHAZADO')
        ) THEN
          RAISE EXCEPTION 'Las proyecciones no se pueden modificar con un plan enviado o aprobado';
        END IF;
        RETURN OLD;
      END;
    $$`);
  }
}
