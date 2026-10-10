import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CatalogsAndProjectionImmutability1791674312940 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO rol (nombre) VALUES ('PLANIFICADOR'), ('SUBGERENTE'), ('JEFE_TURNO')`,
    );
    await queryRunner.query(
      `INSERT INTO fruta (nombre) VALUES ('Uva'), ('Arándano')`,
    );
    await queryRunner.query(
      `INSERT INTO area (nombre, proporcion) VALUES ('Almacén', 0.039), ('Trazabilidad', 0.025), ('Mantenimiento', 0.021), ('Saneamiento', 0.045), ('Packing', 0.870)`,
    );
    // Plant values are examples from the source document, not official production settings.
    await queryRunner.query(
      `INSERT INTO planta (nombre, "rendimientoPersonaHora", "personalMaximo", "horasJornada", "horasExtraMax", "horaInicio", "factorEficiencia", "toleranciaVolumen") VALUES ('Piura', 5.0, 300, 10, 2, '17:00', 0.8, 5), ('Sullana', 5.9, 1200, 12, 2, '17:00', 0.8, 5)`,
    );
    await queryRunner.query(
      `CREATE FUNCTION prevent_projection_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Las proyecciones son inmutables'; END; $$`,
    );
    await queryRunner.query(
      `CREATE TRIGGER projection_immutable BEFORE UPDATE OR DELETE ON proyeccion FOR EACH ROW EXECUTE FUNCTION prevent_projection_mutation()`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER projection_immutable ON proyeccion`);
    await queryRunner.query(`DROP FUNCTION prevent_projection_mutation()`);
    await queryRunner.query(
      `DELETE FROM planta WHERE nombre IN ('Piura', 'Sullana')`,
    );
    await queryRunner.query(
      `DELETE FROM area WHERE nombre IN ('Almacén', 'Trazabilidad', 'Mantenimiento', 'Saneamiento', 'Packing')`,
    );
    await queryRunner.query(
      `DELETE FROM fruta WHERE nombre IN ('Uva', 'Arándano')`,
    );
    await queryRunner.query(
      `DELETE FROM rol WHERE nombre IN ('PLANIFICADOR', 'SUBGERENTE', 'JEFE_TURNO')`,
    );
  }
}
