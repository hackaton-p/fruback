import { ProgressType } from '../../domain/enums';
import { AreaEntity } from '../../../catalogs/infrastructure/persistence/area.entity';
import { Entity, Column, Check, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { BaseEntity } from '../../../../shared/infrastructure/persistence/base.entity';

import { WorkdayEntity } from './workday.entity';
import { UserEntity } from '../../../auth/infrastructure/persistence/user.entity';
@Entity('registro_avance')
@Check(
  'ck_registro_avance_0',
  `"jabasRecibidasAcum" >= 0 AND "jabasProcesadasAcum" >= 0 AND "trabajadoresPresentes" >= 0`,
)
@Check(
  'ck_progress_type',
  `("tipo" = 'AVANCE' AND "jabasRecibidasAcum" IS NOT NULL AND "jabasProcesadasAcum" IS NOT NULL AND "jabasProcesadasAcum" <= "jabasRecibidasAcum" AND "areaId" IS NULL AND "cambioPersonal" IS NULL AND "jabasEsperadasDia" IS NULL) OR ("tipo" = 'PERSONAL' AND "areaId" IS NOT NULL AND "cambioPersonal" IS NOT NULL AND "cambioPersonal" <> 0 AND "jabasRecibidasAcum" IS NULL AND "jabasProcesadasAcum" IS NULL AND "jabasEsperadasDia" IS NULL) OR ("tipo" = 'VOLUMEN' AND "jabasEsperadasDia" IS NOT NULL AND "jabasEsperadasDia" >= 0 AND "areaId" IS NULL AND "cambioPersonal" IS NULL AND "jabasRecibidasAcum" IS NULL AND "jabasProcesadasAcum" IS NULL)`,
)
@Check(
  'ck_progress_estimate',
  `"horasEstimadas" IS NULL OR "horasEstimadas" >= 0`,
)
@Index('idx_registro_avance_0', ['workdayId', 'recordedAt'])
export class ProgressRecordEntity extends BaseEntity {
  @Column({ name: 'tipo', type: 'varchar', length: 20 }) type!: ProgressType;
  @Column({ type: 'integer', nullable: true }) areaId!: number | null;
  @ManyToOne(() => AreaEntity, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'areaId' })
  area!: Relation<AreaEntity> | null;
  @Column({ name: 'cambioPersonal', type: 'integer', nullable: true })
  staffChange!: number | null;
  @Column({
    name: 'jabasEsperadasDia',
    type: 'numeric',
    precision: 14,
    scale: 4,
    nullable: true,
  })
  expectedDailyCrates!: string | null;
  @Column({
    name: 'horasEstimadas',
    type: 'numeric',
    precision: 14,
    scale: 4,
    nullable: true,
  })
  estimatedHours!: string | null;

  @Column({ name: 'jornadaId', type: 'integer' }) workdayId!: number;
  @ManyToOne(() => WorkdayEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'jornadaId' })
  workday!: Relation<WorkdayEntity>;
  @Column({ name: 'hora', type: 'timestamptz' }) recordedAt!: Date;
  @Column({
    name: 'jabasRecibidasAcum',
    type: 'numeric',
    precision: 14,
    scale: 4,
    nullable: true,
  })
  cumulativeReceivedCrates!: string | null;
  @Column({
    name: 'jabasProcesadasAcum',
    type: 'numeric',
    precision: 14,
    scale: 4,
    nullable: true,
  })
  cumulativeProcessedCrates!: string | null;
  @Column({ name: 'trabajadoresPresentes', type: 'integer' })
  presentWorkers!: number;
  @Column({ name: 'registradoPorId', type: 'integer' }) recordedById!: number;
  @ManyToOne(() => UserEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'registradoPorId' })
  recordedBy!: Relation<UserEntity>;
}
