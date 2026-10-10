import { Entity, Column, Check } from 'typeorm';
import { BaseEntity } from '../../../../shared/infrastructure/persistence/base.entity';

@Entity('planta')
@Check(
  'ck_planta_0',
  `"rendimientoPersonaHora" > 0 AND "personalMaximo" >= 1 AND "horasJornada" BETWEEN 1 AND 24 AND "horasExtraMax" >= 0 AND "factorEficiencia" BETWEEN 0.1 AND 1 AND "toleranciaVolumen" BETWEEN 0 AND 100`,
)
export class PlantEntity extends BaseEntity {
  @Column({ name: 'nombre', type: 'varchar', length: 255, unique: true })
  name!: string;
  @Column({
    name: 'rendimientoPersonaHora',
    type: 'numeric',
    precision: 14,
    scale: 4,
  })
  boxesPerWorkerHour!: string;
  @Column({ name: 'personalMaximo', type: 'integer' }) maxWorkers!: number;
  @Column({ name: 'horasJornada', type: 'numeric', precision: 14, scale: 4 })
  shiftHours!: string;
  @Column({ name: 'horasExtraMax', type: 'numeric', precision: 14, scale: 4 })
  maxOvertimeHours!: string;
  @Column({ name: 'horaInicio', type: 'time' }) startTime!: string;
  @Column({
    name: 'factorEficiencia',
    type: 'numeric',
    precision: 14,
    scale: 4,
  })
  efficiencyFactor!: string;
  @Column({
    name: 'toleranciaVolumen',
    type: 'numeric',
    precision: 14,
    scale: 4,
  })
  volumeTolerancePercent!: string;
}
