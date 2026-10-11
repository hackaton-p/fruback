import type { MigrationInterface, QueryRunner } from 'typeorm';

export class UserPlantAssignments1791682000000 implements MigrationInterface {
  name = 'UserPlantAssignments1791682000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "usuario_planta" (
        "usuarioId" integer NOT NULL,
        "plantaId" integer NOT NULL,
        CONSTRAINT "pk_usuario_planta" PRIMARY KEY ("usuarioId", "plantaId"),
        CONSTRAINT "fk_usuario_planta_usuario" FOREIGN KEY ("usuarioId") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "fk_usuario_planta_planta" FOREIGN KEY ("plantaId") REFERENCES "planta"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_usuario_planta_planta" ON "usuario_planta" ("plantaId")`);
    await queryRunner.query(`INSERT INTO "usuario_planta" ("usuarioId", "plantaId") SELECT "id", "plantaId" FROM "usuario" WHERE "plantaId" IS NOT NULL`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const rows = (await queryRunner.query(`
      SELECT COUNT(*)::integer AS count
      FROM "usuario_planta" AS assignment
      LEFT JOIN "usuario" AS profile ON profile."id" = assignment."usuarioId"
      WHERE profile."plantaId" IS DISTINCT FROM assignment."plantaId"
    `)) as Array<{ count: number }>;
    if (Number(rows[0]?.count ?? 0) > 0) {
      throw new Error(
        'Cannot revert user plant assignments while multi-plant assignments exist; the previous schema cannot represent them.',
      );
    }
    await queryRunner.query(`DROP TABLE "usuario_planta"`);
  }
}
