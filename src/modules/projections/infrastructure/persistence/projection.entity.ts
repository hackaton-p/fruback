import { Entity, Column, Check, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { BaseEntity } from '../../../../shared/infrastructure/persistence/base.entity';
import { ProjectionType } from '../../domain/enums';
import { PlantEntity } from '../../../plants/infrastructure/persistence/plant.entity';
import { FruitEntity } from '../../../catalogs/infrastructure/persistence/fruit.entity';
import { CustomerEntity } from '../../../catalogs/infrastructure/persistence/customer.entity';
@Entity('proyeccion')
@Check(
  'ck_proyeccion_0',
  `"anio" BETWEEN 1 AND 9999 AND "semana" BETWEEN 1 AND 53`,
)
@Check('ck_proyeccion_1', `"cajas" >= 0`)
@Check(
  'ck_proyeccion_2',
  `("tipo" = 'COSECHA' AND "fecha" IS NOT NULL AND "clienteId" IS NULL AND EXTRACT(ISOYEAR FROM "fecha") = "anio" AND EXTRACT(WEEK FROM "fecha") = "semana") OR ("tipo" = 'COMERCIAL' AND "clienteId" IS NOT NULL AND "fecha" IS NULL)`,
)
@Index('idx_proyeccion_0', ['plantId', 'fruitId', 'year', 'week', 'type'])
export class ProjectionEntity extends BaseEntity {
  @Column({ name: 'plantaId', type: 'integer' }) plantId!: number;
  @ManyToOne(() => PlantEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'plantaId' })
  plant!: Relation<PlantEntity>;
  @Column({ name: 'frutaId', type: 'integer' }) fruitId!: number;
  @ManyToOne(() => FruitEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'frutaId' })
  fruit!: Relation<FruitEntity>;
  @Column({ name: 'clienteId', type: 'integer', nullable: true }) customerId!:
    number | null;
  @ManyToOne(() => CustomerEntity, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'clienteId' })
  customer!: Relation<CustomerEntity> | null;
  @Column({ name: 'tipo', type: 'varchar', length: 255 }) type!: ProjectionType;
  @Column({ name: 'anio', type: 'integer' }) year!: number;
  @Column({ name: 'semana', type: 'integer' }) week!: number;
  @Column({ name: 'fecha', type: 'date', nullable: true }) date!: string | null;
  @Column({ name: 'cajas', type: 'numeric', precision: 14, scale: 4 })
  boxes!: string;
}
