import { plantParametersTransformer } from './plant-parameters.transformer';
import { Entity, Column, Check, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { BaseEntity } from '../../../../shared/infrastructure/persistence/base.entity';
import { PlanStatus, HarvestScenario } from '../../domain/enums';
import type { PlantParameters } from '../../../plants/domain/plant-parameters';
import { PlantEntity } from '../../../plants/infrastructure/persistence/plant.entity';
import { FruitEntity } from '../../../catalogs/infrastructure/persistence/fruit.entity';
import { UserEntity } from '../../../auth/infrastructure/persistence/user.entity';
@Entity('plan')
@Check('ck_plan_0', `"anio" BETWEEN 1 AND 9999 AND "semana" BETWEEN 1 AND 53`)
@Check('ck_plan_1', `"escenarioCosecha" IN ('PROYECTADA', '+10', '+20', '-10')`)
@Check(
  'ck_plan_2',
  `"estado" IN ('BORRADOR', 'PENDIENTE', 'APROBADO', 'RECHAZADO', 'EN_EJECUCION', 'CERRADO')`,
)
@Check(
  'ck_plan_3',
  `"estado" <> 'RECHAZADO' OR ("comentarioAprobacion" IS NOT NULL AND length(trim("comentarioAprobacion")) > 0)`,
)
@Index('idx_plan_0', ['plantId', 'year', 'week', 'status'])
@Index('idx_plan_1', ['plantId', 'fruitId', 'year', 'week'], {
  unique: true,
  where: `"estado" IN ('APROBADO', 'EN_EJECUCION')`,
})
@Index('idx_plan_2', ['plantId', 'fruitId', 'year', 'week'], {
  unique: true,
  where: `"estado" = 'BORRADOR'`,
})
export class PlanEntity extends BaseEntity {
  @Column({ name: 'plantaId', type: 'integer' }) plantId!: number;
  @ManyToOne(() => PlantEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'plantaId' })
  plant!: Relation<PlantEntity>;
  @Column({ name: 'frutaId', type: 'integer' }) fruitId!: number;
  @ManyToOne(() => FruitEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'frutaId' })
  fruit!: Relation<FruitEntity>;
  @Column({ name: 'anio', type: 'integer' }) year!: number;
  @Column({ name: 'semana', type: 'integer' }) week!: number;
  @Column({ name: 'escenarioCosecha', type: 'varchar', length: 255 })
  harvestScenario!: HarvestScenario;
  @Column({
    name: 'parametrosUsados',
    type: 'jsonb',
    transformer: plantParametersTransformer,
  })
  parametersSnapshot!: PlantParameters;
  @Column({ name: 'parametrosModificados', type: 'boolean', default: false })
  hasModifiedParameters!: boolean;
  @Column({ name: 'estado', type: 'varchar', length: 255, default: 'BORRADOR' })
  status!: PlanStatus;
  @Column({ name: 'creadoPorId', type: 'integer' }) createdById!: number;
  @ManyToOne(() => UserEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'creadoPorId' })
  createdBy!: Relation<UserEntity>;
  @Column({ name: 'fechaEnvio', type: 'timestamptz', nullable: true })
  submittedAt!: Date | null;
  @Column({ name: 'aprobadoPorId', type: 'integer', nullable: true })
  approvedById!: number | null;
  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'aprobadoPorId' })
  approvedBy!: Relation<UserEntity> | null;
  @Column({ name: 'fechaAprobacion', type: 'timestamptz', nullable: true })
  approvedAt!: Date | null;
  @Column({ name: 'comentarioAprobacion', type: 'text', nullable: true })
  approvalComment!: string | null;
}
