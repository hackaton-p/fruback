import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AssignmentIndexMetadata1791687000000 implements MigrationInterface {
  name = 'AssignmentIndexMetadata1791687000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER INDEX "idx_usuario_planta_planta" RENAME TO "IDX_fba0d248298b2a79642a2a5998"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c907ef969d0ec3888da5cebe16" ON "usuario_planta" ("usuarioId")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_c907ef969d0ec3888da5cebe16"`);
    await queryRunner.query(
      `ALTER INDEX "IDX_fba0d248298b2a79642a2a5998" RENAME TO "idx_usuario_planta_planta"`,
    );
  }
}
