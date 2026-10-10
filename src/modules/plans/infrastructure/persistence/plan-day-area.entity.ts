import { Entity, Column, Check, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { BaseEntity } from '../../../../shared/infrastructure/persistence/base.entity';

import { PlanDayEntity } from './plan-day.entity';
import { AreaEntity } from '../../../catalogs/infrastructure/persistence/area.entity';
@Entity('plan_dia_area')
@Check('ck_plan_dia_area_0', `"trabajadoresPlan" >= 0`)
@Check(
  'ck_plan_dia_area_1',
  `"trabajadoresPresentes" IS NULL OR "trabajadoresPresentes" >= 0`,
)
@Index('idx_plan_dia_area_0', ['planDayId', 'areaId'], { unique: true })
export class PlanDayAreaEntity extends BaseEntity {
  @Column({ name: 'planDiaId', type: 'integer' }) planDayId!: number;
  @ManyToOne(() => PlanDayEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'planDiaId' })
  planDay!: Relation<PlanDayEntity>;
  @Column({ type: 'integer' }) areaId!: number;
  @ManyToOne(() => AreaEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'areaId' })
  area!: Relation<AreaEntity>;
  @Column({ name: 'trabajadoresPlan', type: 'integer' })
  plannedWorkers!: number;
  @Column({ name: 'trabajadoresPresentes', type: 'integer', nullable: true })
  presentWorkers!: number | null;
}
