import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialPacking1791674312939 implements MigrationInterface {
  name = 'InitialPacking1791674312939';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "planta" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "nombre" character varying(255) NOT NULL, "rendimientoPersonaHora" numeric(14,4) NOT NULL, "personalMaximo" integer NOT NULL, "horasJornada" numeric(14,4) NOT NULL, "horasExtraMax" numeric(14,4) NOT NULL, "horaInicio" TIME NOT NULL, "factorEficiencia" numeric(14,4) NOT NULL, "toleranciaVolumen" numeric(14,4) NOT NULL, CONSTRAINT "UQ_370f346ff7340a356e4500912e8" UNIQUE ("nombre"), CONSTRAINT "ck_planta_0" CHECK ("rendimientoPersonaHora" > 0 AND "personalMaximo" >= 1 AND "horasJornada" BETWEEN 1 AND 24 AND "horasExtraMax" >= 0 AND "factorEficiencia" BETWEEN 0.1 AND 1 AND "toleranciaVolumen" BETWEEN 0 AND 100), CONSTRAINT "PK_799329f262c355b810cd00d461e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "rol" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "nombre" character varying(255) NOT NULL, CONSTRAINT "ck_rol_0" CHECK ("nombre" IN ('ADMIN', 'PLANIFICADOR', 'SUBGERENTE', 'JEFE_TURNO')), CONSTRAINT "PK_c93a22388638fac311781c7f2dd" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_rol_0" ON "rol" ("nombre") `,
    );
    await queryRunner.query(
      `CREATE TABLE "usuario" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "rolId" integer NOT NULL, "plantaId" integer, "nombre" character varying(255) NOT NULL, "email" character varying(255) NOT NULL, "passwordHash" character varying(255) NOT NULL, CONSTRAINT "UQ_2863682842e688ca198eb25c124" UNIQUE ("email"), CONSTRAINT "PK_a56c58e5cabaa04fb2c98d2d7e2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_usuario_0" ON "usuario" ("plantaId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "fruta" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "nombre" character varying(255) NOT NULL, CONSTRAINT "UQ_e9f0ca5ff209b37cc8f8f259b54" UNIQUE ("nombre"), CONSTRAINT "PK_969e31b9e51e19925f4e20c1dea" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "cliente" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "nombre" character varying(255) NOT NULL, "pais" character varying(255) NOT NULL, CONSTRAINT "UQ_3aa405575a194aedb44a592bc14" UNIQUE ("nombre"), CONSTRAINT "PK_18990e8df6cf7fe71b9dc0f5f39" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "area" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "nombre" character varying(255) NOT NULL, "proporcion" numeric(14,4) NOT NULL, CONSTRAINT "UQ_2725fe3ddbc933b32810f6b3ec7" UNIQUE ("nombre"), CONSTRAINT "ck_area_0" CHECK ("proporcion" BETWEEN 0 AND 1), CONSTRAINT "PK_39d5e4de490139d6535d75f42ff" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "proyeccion" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "plantaId" integer NOT NULL, "frutaId" integer NOT NULL, "clienteId" integer, "tipo" character varying(255) NOT NULL, "anio" integer NOT NULL, "semana" integer NOT NULL, "fecha" date, "cajas" numeric(14,4) NOT NULL, CONSTRAINT "ck_proyeccion_2" CHECK (("tipo" = 'COSECHA' AND "fecha" IS NOT NULL AND "clienteId" IS NULL AND EXTRACT(ISOYEAR FROM "fecha") = "anio" AND EXTRACT(WEEK FROM "fecha") = "semana") OR ("tipo" = 'COMERCIAL' AND "clienteId" IS NOT NULL AND "fecha" IS NULL)), CONSTRAINT "ck_proyeccion_1" CHECK ("cajas" >= 0), CONSTRAINT "ck_proyeccion_0" CHECK ("anio" BETWEEN 1 AND 9999 AND "semana" BETWEEN 1 AND 53), CONSTRAINT "PK_753bce8b40f7a75946180fef674" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_proyeccion_0" ON "proyeccion" ("plantaId", "frutaId", "anio", "semana", "tipo") `,
    );
    await queryRunner.query(
      `CREATE TABLE "plan" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "plantaId" integer NOT NULL, "frutaId" integer NOT NULL, "anio" integer NOT NULL, "semana" integer NOT NULL, "escenarioCosecha" character varying(255) NOT NULL, "parametrosUsados" jsonb NOT NULL, "parametrosSobrescritos" boolean NOT NULL DEFAULT false, "estado" character varying(255) NOT NULL DEFAULT 'BORRADOR', "creadoPorId" integer NOT NULL, "fechaEnvio" TIMESTAMP WITH TIME ZONE, "aprobadoPorId" integer, "fechaAprobacion" TIMESTAMP WITH TIME ZONE, "comentarioAprobacion" text, CONSTRAINT "ck_plan_3" CHECK ("estado" <> 'RECHAZADO' OR ("comentarioAprobacion" IS NOT NULL AND length(trim("comentarioAprobacion")) > 0)), CONSTRAINT "ck_plan_2" CHECK ("estado" IN ('BORRADOR', 'PENDIENTE', 'APROBADO', 'RECHAZADO', 'EN_EJECUCION', 'CERRADO')), CONSTRAINT "ck_plan_1" CHECK ("escenarioCosecha" IN ('PROYECTADA', '+10', '+20', '-10')), CONSTRAINT "ck_plan_0" CHECK ("anio" BETWEEN 1 AND 9999 AND "semana" BETWEEN 1 AND 53), CONSTRAINT "PK_54a2b686aed3b637654bf7ddbb3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_plan_2" ON "plan" ("plantaId", "frutaId", "anio", "semana") WHERE "estado" = 'BORRADOR'`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_plan_1" ON "plan" ("plantaId", "frutaId", "anio", "semana") WHERE "estado" IN ('APROBADO', 'EN_EJECUCION')`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_plan_0" ON "plan" ("plantaId", "anio", "semana", "estado") `,
    );
    await queryRunner.query(
      `CREATE TABLE "plan_dia" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "planId" integer NOT NULL, "fecha" date NOT NULL, "cajasMeta" numeric(14,4) NOT NULL, "trabajadores" integer NOT NULL, "horas" numeric(14,4) NOT NULL, "horasActualizadas" numeric(14,4), "motivoAjuste" character varying(255), CONSTRAINT "ck_plan_dia_1" CHECK (("horasActualizadas" IS NULL AND "motivoAjuste" IS NULL) OR ("horasActualizadas" IS NOT NULL AND "horasActualizadas" >= 0 AND "motivoAjuste" IS NOT NULL AND "motivoAjuste" IN ('CAMBIO_VOLUMEN', 'PERSONAL_PRESENTE'))), CONSTRAINT "ck_plan_dia_0" CHECK ("cajasMeta" >= 0 AND "trabajadores" >= 0 AND "horas" >= 0), CONSTRAINT "PK_5ef9f3aea3bb8b4e060491d8d44" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_plan_dia_0" ON "plan_dia" ("planId", "fecha") `,
    );
    await queryRunner.query(
      `CREATE TABLE "plan_dia_area" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "planDiaId" integer NOT NULL, "areaId" integer NOT NULL, "trabajadoresPlan" integer NOT NULL, "trabajadoresPresentes" integer, CONSTRAINT "ck_plan_dia_area_1" CHECK ("trabajadoresPresentes" IS NULL OR "trabajadoresPresentes" >= 0), CONSTRAINT "ck_plan_dia_area_0" CHECK ("trabajadoresPlan" >= 0), CONSTRAINT "PK_05275d5fcc16bf516f6aa3b0caf" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_plan_dia_area_0" ON "plan_dia_area" ("planDiaId", "areaId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "jornada" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "planDiaId" integer NOT NULL, "fechaInicio" TIMESTAMP WITH TIME ZONE NOT NULL, "fechaCierre" TIMESTAMP WITH TIME ZONE, "trabajadoresPresentes" integer NOT NULL, "cajasRecibidas" numeric(14,4) NOT NULL DEFAULT '0', "horasTrabajadas" numeric(14,4), "cajasProcesadas" numeric(14,4) NOT NULL DEFAULT '0', "cajasDescarte" numeric(14,4), "kgLoose" numeric(14,4), "kgFijo" numeric(14,4), "metaCumplida" boolean, "diferencia" numeric(14,4), CONSTRAINT "REL_a5e622e2cc1d7bbf8afce5a341" UNIQUE ("planDiaId"), CONSTRAINT "ck_jornada_5" CHECK ("fechaCierre" IS NULL OR ("fechaCierre" >= "fechaInicio" AND "horasTrabajadas" IS NOT NULL AND "cajasDescarte" IS NOT NULL AND "kgLoose" IS NOT NULL AND "kgFijo" IS NOT NULL AND "metaCumplida" IS NOT NULL AND "diferencia" IS NOT NULL)), CONSTRAINT "ck_jornada_4" CHECK ("kgFijo" IS NULL OR "kgFijo" >= 0), CONSTRAINT "ck_jornada_3" CHECK ("kgLoose" IS NULL OR "kgLoose" >= 0), CONSTRAINT "ck_jornada_2" CHECK ("cajasDescarte" IS NULL OR "cajasDescarte" >= 0), CONSTRAINT "ck_jornada_1" CHECK ("horasTrabajadas" IS NULL OR "horasTrabajadas" >= 0), CONSTRAINT "ck_jornada_0" CHECK ("trabajadoresPresentes" >= 0 AND "cajasRecibidas" >= 0 AND "cajasProcesadas" >= 0), CONSTRAINT "PK_54cc5e0337e3e4e0cf025e2f455" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "registro_avance" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "jornadaId" integer NOT NULL, "hora" TIMESTAMP WITH TIME ZONE NOT NULL, "cajasRecibidasAcum" numeric(14,4) NOT NULL, "cajasProcesadasAcum" numeric(14,4) NOT NULL, "trabajadoresPresentes" integer NOT NULL, "registradoPorId" integer NOT NULL, CONSTRAINT "ck_registro_avance_0" CHECK ("cajasRecibidasAcum" >= 0 AND "cajasProcesadasAcum" >= 0 AND "trabajadoresPresentes" >= 0), CONSTRAINT "PK_3f8d0a82b2daee534be80ae0d97" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_registro_avance_0" ON "registro_avance" ("jornadaId", "hora") `,
    );
    await queryRunner.query(
      `CREATE TABLE "alerta" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "planDiaId" integer NOT NULL, "registroAvanceId" integer, "tipo" character varying(255) NOT NULL, "mensaje" text NOT NULL, "fecha" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "ck_alerta_0" CHECK (("tipo" = 'PLANIFICACION' AND "registroAvanceId" IS NULL) OR ("tipo" IN ('VOLUMEN_ENTRANTE', 'PERSONAL_INSUFICIENTE') AND "registroAvanceId" IS NOT NULL)), CONSTRAINT "PK_e60bfc27e2ae1b6bbdca11ac524" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_alerta_1" ON "alerta" ("registroAvanceId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_alerta_0" ON "alerta" ("planDiaId", "fecha") `,
    );
    await queryRunner.query(
      `ALTER TABLE "usuario" ADD CONSTRAINT "FK_611daf5befc024d9e0bd7bdf4da" FOREIGN KEY ("rolId") REFERENCES "rol"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuario" ADD CONSTRAINT "FK_80fb23bd86add3ec8ca7eef7866" FOREIGN KEY ("plantaId") REFERENCES "planta"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "proyeccion" ADD CONSTRAINT "FK_66af095512d2345c5c43c17eecf" FOREIGN KEY ("plantaId") REFERENCES "planta"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "proyeccion" ADD CONSTRAINT "FK_af0d8cdc0241cdd9441da3a5af7" FOREIGN KEY ("frutaId") REFERENCES "fruta"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "proyeccion" ADD CONSTRAINT "FK_a93ce107b4bbaaec1188df8cdce" FOREIGN KEY ("clienteId") REFERENCES "cliente"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "plan" ADD CONSTRAINT "FK_4692434b2b0747dc23d47c99ce3" FOREIGN KEY ("plantaId") REFERENCES "planta"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "plan" ADD CONSTRAINT "FK_ce3a6ea2af7642aba51765c92e9" FOREIGN KEY ("frutaId") REFERENCES "fruta"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "plan" ADD CONSTRAINT "FK_c1d026da76042c041753a1557ce" FOREIGN KEY ("creadoPorId") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "plan" ADD CONSTRAINT "FK_1ed3b6b1de0d07eb9453debd591" FOREIGN KEY ("aprobadoPorId") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "plan_dia" ADD CONSTRAINT "FK_396ff6d196e2a8fd9dd5739f44d" FOREIGN KEY ("planId") REFERENCES "plan"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "plan_dia_area" ADD CONSTRAINT "FK_76d4d9bc04082d7de941319dfb2" FOREIGN KEY ("planDiaId") REFERENCES "plan_dia"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "plan_dia_area" ADD CONSTRAINT "FK_2b0ed992b150c939c36c43c6dde" FOREIGN KEY ("areaId") REFERENCES "area"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "jornada" ADD CONSTRAINT "FK_a5e622e2cc1d7bbf8afce5a3414" FOREIGN KEY ("planDiaId") REFERENCES "plan_dia"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "registro_avance" ADD CONSTRAINT "FK_643a1c24299b3a36e2096622233" FOREIGN KEY ("jornadaId") REFERENCES "jornada"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "registro_avance" ADD CONSTRAINT "FK_040807612e831d1051b7228ad62" FOREIGN KEY ("registradoPorId") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "alerta" ADD CONSTRAINT "FK_098e42f84964df9b3c43405acdb" FOREIGN KEY ("planDiaId") REFERENCES "plan_dia"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "alerta" ADD CONSTRAINT "FK_a72a11f3e6db39aec2c6010074f" FOREIGN KEY ("registroAvanceId") REFERENCES "registro_avance"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "alerta" DROP CONSTRAINT "FK_a72a11f3e6db39aec2c6010074f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "alerta" DROP CONSTRAINT "FK_098e42f84964df9b3c43405acdb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "registro_avance" DROP CONSTRAINT "FK_040807612e831d1051b7228ad62"`,
    );
    await queryRunner.query(
      `ALTER TABLE "registro_avance" DROP CONSTRAINT "FK_643a1c24299b3a36e2096622233"`,
    );
    await queryRunner.query(
      `ALTER TABLE "jornada" DROP CONSTRAINT "FK_a5e622e2cc1d7bbf8afce5a3414"`,
    );
    await queryRunner.query(
      `ALTER TABLE "plan_dia_area" DROP CONSTRAINT "FK_2b0ed992b150c939c36c43c6dde"`,
    );
    await queryRunner.query(
      `ALTER TABLE "plan_dia_area" DROP CONSTRAINT "FK_76d4d9bc04082d7de941319dfb2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "plan_dia" DROP CONSTRAINT "FK_396ff6d196e2a8fd9dd5739f44d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "plan" DROP CONSTRAINT "FK_1ed3b6b1de0d07eb9453debd591"`,
    );
    await queryRunner.query(
      `ALTER TABLE "plan" DROP CONSTRAINT "FK_c1d026da76042c041753a1557ce"`,
    );
    await queryRunner.query(
      `ALTER TABLE "plan" DROP CONSTRAINT "FK_ce3a6ea2af7642aba51765c92e9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "plan" DROP CONSTRAINT "FK_4692434b2b0747dc23d47c99ce3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "proyeccion" DROP CONSTRAINT "FK_a93ce107b4bbaaec1188df8cdce"`,
    );
    await queryRunner.query(
      `ALTER TABLE "proyeccion" DROP CONSTRAINT "FK_af0d8cdc0241cdd9441da3a5af7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "proyeccion" DROP CONSTRAINT "FK_66af095512d2345c5c43c17eecf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuario" DROP CONSTRAINT "FK_80fb23bd86add3ec8ca7eef7866"`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuario" DROP CONSTRAINT "FK_611daf5befc024d9e0bd7bdf4da"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_alerta_0"`);
    await queryRunner.query(`DROP INDEX "public"."idx_alerta_1"`);
    await queryRunner.query(`DROP TABLE "alerta"`);
    await queryRunner.query(`DROP INDEX "public"."idx_registro_avance_0"`);
    await queryRunner.query(`DROP TABLE "registro_avance"`);
    await queryRunner.query(`DROP TABLE "jornada"`);
    await queryRunner.query(`DROP INDEX "public"."idx_plan_dia_area_0"`);
    await queryRunner.query(`DROP TABLE "plan_dia_area"`);
    await queryRunner.query(`DROP INDEX "public"."idx_plan_dia_0"`);
    await queryRunner.query(`DROP TABLE "plan_dia"`);
    await queryRunner.query(`DROP INDEX "public"."idx_plan_0"`);
    await queryRunner.query(`DROP INDEX "public"."idx_plan_1"`);
    await queryRunner.query(`DROP INDEX "public"."idx_plan_2"`);
    await queryRunner.query(`DROP TABLE "plan"`);
    await queryRunner.query(`DROP INDEX "public"."idx_proyeccion_0"`);
    await queryRunner.query(`DROP TABLE "proyeccion"`);
    await queryRunner.query(`DROP TABLE "area"`);
    await queryRunner.query(`DROP TABLE "cliente"`);
    await queryRunner.query(`DROP TABLE "fruta"`);
    await queryRunner.query(`DROP INDEX "public"."idx_usuario_0"`);
    await queryRunner.query(`DROP TABLE "usuario"`);
    await queryRunner.query(`DROP INDEX "public"."idx_rol_0"`);
    await queryRunner.query(`DROP TABLE "rol"`);
    await queryRunner.query(`DROP TABLE "planta"`);
  }
}
