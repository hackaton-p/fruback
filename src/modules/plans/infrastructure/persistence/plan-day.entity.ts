import { Entity, Column, Check, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { BaseEntity } from '../../../../shared/infrastructure/persistence/base.entity';
import { HourAdjustmentReason } from '../../domain/enums';
import { PlanEntity } from './plan.entity';
@Entity('plan_dia')
@Check(
  'ck_plan_dia_0',
  `"cajasMeta" >= 0 AND "trabajadores" >= 0 AND "horas" >= 0`,
)
@Check(
  'ck_plan_dia_1',
  `("horasActualizadas" IS NULL AND "motivoAjuste" IS NULL) OR ("horasActualizadas" IS NOT NULL AND "horasActualizadas" >= 0 AND "motivoAjuste" IS NOT NULL AND "motivoAjuste" IN ('CAMBIO_VOLUMEN', 'PERSONAL_PRESENTE'))`,
)
@Index('idx_plan_dia_0', ['planId', 'date'], { unique: true })
export class PlanDayEntity extends BaseEntity {
  @Column({ type: 'integer' }) planId!: number;
  @ManyToOne(() => PlanEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'planId' })
  plan!: Relation<PlanEntity>;
  @Column({ name: 'fecha', type: 'date' }) date!: string;
  @Column({ name: 'cajasMeta', type: 'numeric', precision: 14, scale: 4 })
  targetBoxes!: string;
  @Column({ name: 'trabajadores', type: 'integer' }) workers!: number;
  @Column({ name: 'horas', type: 'numeric', precision: 14, scale: 4 })
  hours!: string;
  @Column({
    name: 'horasActualizadas',
    type: 'numeric',
    precision: 14,
    scale: 4,
    nullable: true,
  })
  adjustedHours!: string | null;
  @Column({
    name: 'motivoAjuste',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  adjustmentReason!: HourAdjustmentReason | null;
}
