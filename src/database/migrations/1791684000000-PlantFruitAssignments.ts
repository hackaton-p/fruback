import type { MigrationInterface, QueryRunner } from 'typeorm';

export class PlantFruitAssignments1791684000000 implements MigrationInterface {
  name = 'PlantFruitAssignments1791684000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "planta_fruta" (
        "id" SERIAL NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "plantaId" integer NOT NULL,
        "frutaId" integer NOT NULL,
        CONSTRAINT "PK_planta_fruta" PRIMARY KEY ("id"),
        CONSTRAINT "uq_planta_fruta" UNIQUE ("plantaId", "frutaId"),
        CONSTRAINT "FK_planta_fruta_planta" FOREIGN KEY ("plantaId") REFERENCES "planta"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_planta_fruta_fruta" FOREIGN KEY ("frutaId") REFERENCES "fruta"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      INSERT INTO "planta_fruta" ("plantaId", "frutaId")
      SELECT p.id, f.id FROM "planta" p CROSS JOIN "fruta" f
      ON CONFLICT ("plantaId", "frutaId") DO NOTHING
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "planta_fruta"`);
  }
}
