import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Las proyecciones se pueden reemplazar (borrar y registrar de nuevo) mientras
 * ningún plan de la misma planta, fruta y semana haya sido enviado o aprobado.
 * Las filas siguen sin poder actualizarse in situ.
 */
export class EditableProjectionsBeforeApproval1791683000000 implements MigrationInterface {
  name = 'EditableProjectionsBeforeApproval1791683000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER projection_immutable ON proyeccion`);
    await queryRunner.query(
      `CREATE TRIGGER projection_no_update BEFORE UPDATE ON proyeccion FOR EACH ROW EXECUTE FUNCTION prevent_projection_mutation()`,
    );
    await queryRunner.query(
      `CREATE FUNCTION prevent_locked_projection_delete() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF EXISTS (SELECT 1 FROM plan WHERE "plantaId" = OLD."plantaId" AND "frutaId" = OLD."frutaId" AND "anio" = OLD."anio" AND "semana" = OLD."semana" AND "estado" NOT IN ('BORRADOR', 'RECHAZADO')) THEN RAISE EXCEPTION 'Las proyecciones no se pueden modificar con un plan enviado o aprobado'; END IF; RETURN OLD; END; $$`,
    );
    await queryRunner.query(
      `CREATE TRIGGER projection_locked_delete BEFORE DELETE ON proyeccion FOR EACH ROW EXECUTE FUNCTION prevent_locked_projection_delete()`,
    );
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER projection_locked_delete ON proyeccion`,
    );
    await queryRunner.query(`DROP FUNCTION prevent_locked_projection_delete()`);
    await queryRunner.query(`DROP TRIGGER projection_no_update ON proyeccion`);
    await queryRunner.query(
      `CREATE TRIGGER projection_immutable BEFORE UPDATE OR DELETE ON proyeccion FOR EACH ROW EXECUTE FUNCTION prevent_projection_mutation()`,
    );
  }
}
