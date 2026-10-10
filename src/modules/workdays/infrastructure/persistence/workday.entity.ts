import { Entity, Column, Check, JoinColumn, OneToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { BaseEntity } from '../../../../shared/infrastructure/persistence/base.entity';

import { PlanDayEntity } from '../../../plans/infrastructure/persistence/plan-day.entity';
@Entity('jornada')
@Check(
  'ck_jornada_0',
  `"trabajadoresPresentes" >= 0 AND "cajasRecibidas" >= 0 AND "cajasProcesadas" >= 0`,
)
@Check('ck_jornada_1', `"horasTrabajadas" IS NULL OR "horasTrabajadas" >= 0`)
@Check('ck_jornada_2', `"cajasDescarte" IS NULL OR "cajasDescarte" >= 0`)
@Check('ck_jornada_3', `"kgLoose" IS NULL OR "kgLoose" >= 0`)
@Check('ck_jornada_4', `"kgFijo" IS NULL OR "kgFijo" >= 0`)
@Check(
  'ck_jornada_5',
  `"fechaCierre" IS NULL OR ("fechaCierre" >= "fechaInicio" AND "horasTrabajadas" IS NOT NULL AND "cajasDescarte" IS NOT NULL AND "kgLoose" IS NOT NULL AND "kgFijo" IS NOT NULL AND "metaCumplida" IS NOT NULL AND "diferencia" IS NOT NULL)`,
)
export class WorkdayEntity extends BaseEntity {
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
    name: 'cajasRecibidas',
    type: 'numeric',
    precision: 14,
    scale: 4,
    default: 0,
  })
  receivedBoxes!: string;
  @Column({
    name: 'horasTrabajadas',
    type: 'numeric',
    precision: 14,
    scale: 4,
    nullable: true,
  })
  workedHours!: string | null;
  @Column({
    name: 'cajasProcesadas',
    type: 'numeric',
    precision: 14,
    scale: 4,
    default: 0,
  })
  processedBoxes!: string;
  @Column({
    name: 'cajasDescarte',
    type: 'numeric',
    precision: 14,
    scale: 4,
    nullable: true,
  })
  discardedBoxes!: string | null;
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
