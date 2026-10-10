import { Entity, Column, Check, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { BaseEntity } from '../../../../shared/infrastructure/persistence/base.entity';
import { AlertType } from '../../domain/enums';
import { PlanDayEntity } from '../../../plans/infrastructure/persistence/plan-day.entity';
import { ProgressRecordEntity } from '../../../workdays/infrastructure/persistence/progress-record.entity';
@Entity('alerta')
@Check(
  'ck_alerta_0',
  `("tipo" = 'PLANIFICACION' AND "registroAvanceId" IS NULL) OR ("tipo" IN ('VOLUMEN_ENTRANTE', 'PERSONAL_INSUFICIENTE') AND "registroAvanceId" IS NOT NULL)`,
)
@Index('idx_alerta_0', ['planDayId', 'date'])
@Index('idx_alerta_1', ['progressRecordId'])
export class AlertEntity extends BaseEntity {
  @Column({ name: 'planDiaId', type: 'integer' }) planDayId!: number;
  @ManyToOne(() => PlanDayEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'planDiaId' })
  planDay!: Relation<PlanDayEntity>;
  @Column({ name: 'registroAvanceId', type: 'integer', nullable: true })
  progressRecordId!: number | null;
  @ManyToOne(() => ProgressRecordEntity, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'registroAvanceId' })
  progressRecord!: Relation<ProgressRecordEntity> | null;
  @Column({ name: 'tipo', type: 'varchar', length: 255 }) type!: AlertType;
  @Column({ name: 'mensaje', type: 'text' }) message!: string;
  @Column({ name: 'fecha', type: 'timestamptz' }) date!: Date;
}
