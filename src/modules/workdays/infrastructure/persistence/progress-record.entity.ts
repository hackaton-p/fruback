import { Entity, Column, Check, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { BaseEntity } from '../../../../shared/infrastructure/persistence/base.entity';

import { WorkdayEntity } from './workday.entity';
import { UserEntity } from '../../../auth/infrastructure/persistence/user.entity';
@Entity('registro_avance')
@Check(
  'ck_registro_avance_0',
  `"cajasRecibidasAcum" >= 0 AND "cajasProcesadasAcum" >= 0 AND "trabajadoresPresentes" >= 0`,
)
@Index('idx_registro_avance_0', ['workdayId', 'recordedAt'], { unique: true })
export class ProgressRecordEntity extends BaseEntity {
  @Column({ name: 'jornadaId', type: 'integer' }) workdayId!: number;
  @ManyToOne(() => WorkdayEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'jornadaId' })
  workday!: Relation<WorkdayEntity>;
  @Column({ name: 'hora', type: 'timestamptz' }) recordedAt!: Date;
  @Column({
    name: 'cajasRecibidasAcum',
    type: 'numeric',
    precision: 14,
    scale: 4,
  })
  cumulativeReceivedBoxes!: string;
  @Column({
    name: 'cajasProcesadasAcum',
    type: 'numeric',
    precision: 14,
    scale: 4,
  })
  cumulativeProcessedBoxes!: string;
  @Column({ name: 'trabajadoresPresentes', type: 'integer' })
  presentWorkers!: number;
  @Column({ name: 'registradoPorId', type: 'integer' }) recordedById!: number;
  @ManyToOne(() => UserEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'registradoPorId' })
  recordedBy!: Relation<UserEntity>;
}
