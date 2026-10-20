import { Entity, Column, Check, JoinColumn, OneToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { BaseEntity } from '../../../../shared/infrastructure/persistence/base.entity';

import { PlanDayEntity } from '../../../plans/infrastructure/persistence/plan-day.entity';
@Entity('jornada')
@Check(
  'ck_jornada_0',
  `"trabajadoresPresentes" >= 0 AND "jabasRecibidas" >= 0 AND "jabasProcesadas" >= 0`,
)
@Check(
  'ck_workday_estimate',
  `"jabasEsperadasDia" >= 0 AND ("horasEstimadasInicio" IS NULL OR "horasEstimadasInicio" >= 0)`,
)
@Check('ck_jornada_1', `"horasTrabajadas" IS NULL OR "horasTrabajadas" >= 0`)
@Check('ck_jornada_2', `"jabasDescarte" IS NULL OR "jabasDescarte" >= 0`)
@Check('ck_jornada_3', `"kgLoose" IS NULL OR "kgLoose" >= 0`)
@Check('ck_jornada_4', `"kgFijo" IS NULL OR "kgFijo" >= 0`)
@Check(
  'ck_jornada_5',
  `"fechaCierre" IS NULL OR ("fechaCierre" >= "fechaInicio" AND "horasTrabajadas" IS NOT NULL AND "jabasDescarte" IS NOT NULL AND "kgLoose" IS NOT NULL AND "kgFijo" IS NOT NULL AND "metaCumplida" IS NOT NULL AND "diferencia" IS NOT NULL)`,
)
export class WorkdayEntity extends BaseEntity {
  @Column({ name: 'jabasProcesadasPorFruta', type: 'jsonb', default: [] })
  processedByFruit!: { fruitId: number; fruitName?: string; crates: string }[];
  @Column({
    name: 'horasEstimadasInicio',
    type: 'numeric',
    precision: 14,
    scale: 4,
    nullable: true,
  })
  initialEstimatedHours!: string | null;
  @Column({
    name: 'jabasEsperadasDia',
    type: 'numeric',
    precision: 14,
    scale: 4,
    default: 0,
  })
  expectedDailyCrates!: string;

  @Column({ name: 'planDiaId', type: 'integer' }) planDayId!: number;
  @OneToOne(() => PlanDayEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'planDiaId' })
  planDay!: Relation<PlanDayEntity>;
  @Column({ name: 'fechaInicio', type: 'timestamptz' }) startedAt!: Date;
  @Column({ name: 'fechaCierre', type: 'timestamptz', nullable: true })
  closedAt!: Date | null;
  @Column({ name: 'trabajadoresPresentes', type: 'integer' })
  presentWorkers!: number;
  @Column({
    name: 'jabasRecibidas',
    type: 'numeric',
    precision: 14,
    scale: 4,
    default: 0,
  })
  receivedCrates!: string;
  @Column({
    name: 'horasTrabajadas',
    type: 'numeric',
    precision: 14,
    scale: 4,
    nullable: true,
  })
  workedHours!: string | null;
  @Column({
    name: 'jabasProcesadas',
    type: 'numeric',
    precision: 14,
    scale: 4,
    default: 0,
  })
  processedCrates!: string;
  @Column({
    name: 'jabasDescarte',
    type: 'numeric',
    precision: 14,
    scale: 4,
    nullable: true,
  })
  discardedCrates!: string | null;
  @Column({
    name: 'kgLoose',
    type: 'numeric',
    precision: 14,
    scale: 4,
    nullable: true,
  })
  looseKg!: string | null;
  @Column({
    name: 'kgFijo',
    type: 'numeric',
    precision: 14,
    scale: 4,
    nullable: true,
  })
  fixedKg!: string | null;
  @Column({ name: 'metaCumplida', type: 'boolean', nullable: true })
  targetMet!: boolean | null;
  @Column({
    name: 'diferencia',
    type: 'numeric',
    precision: 14,
    scale: 4,
    nullable: true,
  })
  difference!: string | null;
}
