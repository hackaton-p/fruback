import type { Relation } from 'typeorm';
import { UserEntity } from '../../../auth/infrastructure/persistence/user.entity';
import { Entity, Column, Check, ManyToMany } from 'typeorm';
import { BaseEntity } from '../../../../shared/infrastructure/persistence/base.entity';

@Entity('planta')
@Check(
  'ck_planta_0',
  `"rendimientoPersonaHora" > 0 AND "personalMaximo" >= 1 AND "horasJornada" BETWEEN 1 AND 24 AND "horasExtraMax" >= 0 AND "factorEficiencia" BETWEEN 0.1 AND 1 AND "toleranciaVolumen" BETWEEN 0 AND 100`,
)
export class PlantEntity extends BaseEntity {
  @ManyToMany(() => UserEntity, (user) => user.plants, {
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  users!: Relation<UserEntity[]>;
  @Column({ name: 'nombre', type: 'varchar', length: 255, unique: true })
  name!: string;
  @Column({
    name: 'rendimientoPersonaHora',
    type: 'numeric',
    precision: 14,
    scale: 4,
  })
  cratesPerWorkerHour!: string;
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
  @Column({
    name: 'configurationCompletedAt',
    type: 'timestamptz',
    nullable: true,
  })
  configurationCompletedAt!: Date | null;
  @Column({ name: 'activo', type: 'boolean', default: true })
  isActive!: boolean;
}
