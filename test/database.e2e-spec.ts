import { PlanCommercialSnapshot1791689000000 } from '../src/database/migrations/1791689000000-PlanCommercialSnapshot';
import { IndependentPlanReservations1791686000000 } from '../src/database/migrations/1791686000000-IndependentPlanReservations';
import { PackingV21791679847749 } from '../src/database/migrations/1791679847749-PackingV2';
import { DataSource, QueryRunner } from 'typeorm';
import { databaseOptions } from '../src/database/database.config';
import { PlanEntity } from '../src/modules/plans/infrastructure/persistence/plan.entity';

describe('PostgreSQL schema (requires migrated test database)', () => {
  let source: DataSource;
  let runner: QueryRunner;
  let plantId: number;
  let fruitId: number;
  let userId: number;
  beforeAll(async () => {
    if (!process.env.DB_NAME?.endsWith('_test'))
      throw new Error('Use a dedicated DB_NAME ending in _test');
    source = new DataSource(databaseOptions());
    await source.initialize();
  });
  beforeEach(async () => {
    runner = source.createQueryRunner();
    await runner.startTransaction();
    const plants = await runner.manager.query<{ id: number }[]>(
      `SELECT id FROM planta WHERE nombre = 'Piura'`,
    );
    const fruits = await runner.manager.query<{ id: number }[]>(
      `SELECT id FROM fruta WHERE nombre = 'Uva'`,
    );
    plantId = plants[0].id;
    fruitId = fruits[0].id;
    const users = await runner.manager.query<{ id: number }[]>(
      `INSERT INTO usuario ("rolId", "plantaId", nombre, email, "passwordHash") SELECT id, $1, 'Test', 'schema-test@example.com', 'test-hash' FROM rol WHERE nombre = 'PLANIFICADOR' RETURNING id`,
      [plantId],
    );
    userId = users[0].id;
  });
  afterEach(async () => {
    await runner?.rollbackTransaction();
    await runner?.release();
  });
  afterAll(async () => {
    if (source?.isInitialized) await source.destroy();
  });

  async function expectInvalid(sql: string, args: unknown[] = []) {
    await runner.query('SAVEPOINT invalid_input');
    await expect(runner.query(sql, args)).rejects.toThrow();
    await runner.query('ROLLBACK TO SAVEPOINT invalid_input');
  }
  async function createPlan(consolidated = false) {
    const plans = await runner.manager.query<{ id: number }[]>(
      `INSERT INTO plan ("plantaId", "frutaId", anio, semana, "escenarioCosecha", "parametrosUsados", "parametrosModificados", estado, "creadoPorId") SELECT $1, $2, 2026, 42, 'PROYECTADA', jsonb_build_object('rendimientoPersonaHora', "rendimientoPersonaHora"::text, 'personalMaximo', "personalMaximo", 'horasJornada', "horasJornada"::text, 'horasExtraMax', "horasExtraMax"::text, 'horaInicio', "horaInicio"::text, 'factorEficiencia', "factorEficiencia"::text, 'toleranciaVolumen', "toleranciaVolumen"::text), false, 'APROBADO', $3 FROM planta WHERE id = $1 RETURNING id`,
      [plantId, consolidated ? null : fruitId, userId],
    );
    return plans[0].id;
  }
  it('enforces projection fields and freezes deletion once a plan is reserved', async () => {
    const sql = `INSERT INTO proyeccion ("plantaId", "frutaId", tipo, anio, semana, fecha, jabas) VALUES ($1, $2, $3, 2026, 42, $4, 11180)`;
    await expectInvalid(sql, [plantId, fruitId, 'COSECHA', null]);
    await expectInvalid(sql, [plantId, fruitId, 'COMERCIAL', null]);
    await expectInvalid(sql, [plantId, fruitId, 'COSECHA', '2026-01-01']);
    await runner.query(sql, [plantId, fruitId, 'COSECHA', '2026-10-12']);
    await expectInvalid(`UPDATE proyeccion SET jabas = 1`);
    await runner.query(
      `DELETE FROM proyeccion WHERE "plantaId" = $1 AND "frutaId" = $2`,
      [plantId, fruitId],
    );
    await runner.query(sql, [plantId, fruitId, 'COSECHA', '2026-10-12']);
    await createPlan(true);
    await expectInvalid(
      `DELETE FROM proyeccion WHERE "plantaId" = $1 AND "frutaId" = $2`,
      [plantId, fruitId],
    );
  });
  it('allows multiple reserved plans and retains each configuration snapshot', async () => {
    const id = await createPlan(true);
    const second = await createPlan(true);
    expect(second).not.toBe(id);
    await runner.query(
      `UPDATE planta SET "rendimientoPersonaHora" = 9 WHERE id = $1`,
      [plantId],
    );
    const plan = await runner.manager.findOneByOrFail(PlanEntity, { id });
    expect(Number(plan.parametersSnapshot.cratesPerWorkerHour)).toBe(5.9);
    await expectInvalid(`UPDATE plan SET estado = 'RECHAZADO' WHERE id = $1`, [
      id,
    ]);
  });
  it('guards rollback without deleting independent reserved plans', async () => {
    const first = await createPlan(true);
    const second = await createPlan(true);
    await expect(
      new IndependentPlanReservations1791686000000().down(runner),
    ).rejects.toThrow('Cannot restore weekly uniqueness');
    expect(
      await runner.manager.findOneBy(PlanEntity, { id: first }),
    ).not.toBeNull();
    expect(
      await runner.manager.findOneBy(PlanEntity, { id: second }),
    ).not.toBeNull();
  });
  it('restores the old index on rollback when data is compatible', async () => {
    // Other integration runs may leave valid multiple reservations in this test DB.
    // Isolate the compatible rollback case inside this rolled-back transaction.
    await runner.query(
      `UPDATE plan SET estado = 'BORRADOR' WHERE "frutaId" IS NULL`,
    );
    await createPlan(true);
    const migration = new IndependentPlanReservations1791686000000();
    await migration.down(runner);
    await runner.query('SAVEPOINT duplicate_plan');
    await expect(createPlan(true)).rejects.toThrow();
    await runner.query('ROLLBACK TO SAVEPOINT duplicate_plan');
    await migration.up(runner);
    await expect(createPlan(true)).resolves.toBeGreaterThan(0);
  });
  it('keeps legacy demand unknown and protects saved snapshots from rollback', async () => {
    const id = await createPlan(true);
    let plan = await runner.manager.findOneByOrFail(PlanEntity, { id });
    expect(plan.commercialCratesSnapshot).toBeNull();
    await runner.manager.update(
      PlanEntity,
      { id },
      { commercialCratesSnapshot: '650.0000' },
    );
    plan = await runner.manager.findOneByOrFail(PlanEntity, { id });
    expect(plan.commercialCratesSnapshot).toBe('650.0000');
    await expect(
      new PlanCommercialSnapshot1791689000000().down(runner),
    ).rejects.toThrow('Cannot remove saved commercial demand snapshots');
    expect(
      (await runner.manager.findOneByOrFail(PlanEntity, { id }))
        .commercialCratesSnapshot,
    ).toBe('650.0000');
  });
  it('creates official plans as BORRADOR by default', async () => {
    const id = await createPlan();
    await runner.query(`UPDATE plan SET estado = DEFAULT WHERE id = $1`, [id]);
    const plan = await runner.manager.findOneByOrFail(PlanEntity, { id });
    expect(plan.status).toBe('BORRADOR');
  });
  it('enforces one jornada per day and supports negative closing differences', async () => {
    const id = await createPlan();
    const days = await runner.manager.query<{ id: number }[]>(
      `INSERT INTO plan_dia ("planId", fecha, "jabasMeta", trabajadores, horas) VALUES ($1, '2026-10-12', 11180, 280, 9.98) RETURNING id`,
      [id],
    );
    const day = days[0].id;
    const sql = `INSERT INTO jornada ("planDiaId", "fechaInicio", "trabajadoresPresentes", diferencia) VALUES ($1, now(), 186, -100)`;
    await runner.query(sql, [day]);
    await expectInvalid(sql, [day]);
    await expectInvalid(
      `UPDATE plan_dia SET "horasActualizadas" = 12 WHERE id = $1`,
      [day],
    );
    await runner.query(
      `UPDATE plan_dia SET "horasActualizadas" = 12, "motivoAjuste" = 'PERSONAL_PRESENTE' WHERE id = $1`,
      [day],
    );
  });
  it('reproduces the database constraint behind closing a future workday', async () => {
    const id = await createPlan();
    const days = (await runner.query(
      `INSERT INTO plan_dia ("planId", fecha, "jabasMeta", trabajadores, horas) VALUES ($1, '2026-10-12', 10, 1, 1) RETURNING id`,
      [id],
    )) as { id: number }[];
    await runner.query('SAVEPOINT invalid_close');
    await expect(
      runner.query(
        `INSERT INTO jornada ("planDiaId", "fechaInicio", "fechaCierre", "trabajadoresPresentes", "horasTrabajadas", "jabasDescarte", "kgLoose", "kgFijo", "metaCumplida", diferencia) VALUES ($1, now() + interval '1 day', now(), 1, 1, 0, 0, 0, false, 0)`,
        [days[0].id],
      ),
    ).rejects.toMatchObject({ code: '23514', constraint: 'ck_jornada_5' });
    await runner.query('ROLLBACK TO SAVEPOINT invalid_close');
  });
  it('reproduces calculated-hour overflow rejected by the numeric storage type', async () => {
    const hours = 1e9 / (1 * 0.0001 * 0.1);
    await runner.query('SAVEPOINT invalid_hours');
    await expect(
      runner.query('SELECT $1::numeric(14,4)', [hours]),
    ).rejects.toMatchObject({ code: '22003' });
    await runner.query('ROLLBACK TO SAVEPOINT invalid_hours');
  });
  it('blocks unit migration and rollback when operational data exists', async () => {
    const id = await createPlan();
    const migration = new PackingV21791679847749();
    await expect(migration.up(runner)).rejects.toThrow('changes fruit units');
    await expect(migration.down(runner)).rejects.toThrow('changes fruit units');
    expect(await runner.manager.findOneBy(PlanEntity, { id })).not.toBeNull();
  });
  it('has no schema drift after applying migrations', async () => {
    const diff = await source.driver.createSchemaBuilder().log();
    expect(diff.upQueries).toEqual([]);
  });
});
