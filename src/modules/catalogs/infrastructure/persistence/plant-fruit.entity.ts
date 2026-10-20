import { Column, Entity, Unique, JoinColumn, ManyToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { PlantEntity } from '../../../plants/infrastructure/persistence/plant.entity';
import { FruitEntity } from './fruit.entity';
import { BaseEntity } from '../../../../shared/infrastructure/persistence/base.entity';

@Entity('planta_fruta')
@Unique('uq_planta_fruta', ['plantId', 'fruitId'])
export class PlantFruitEntity extends BaseEntity {
  @Column({ name: 'plantaId', type: 'integer' }) plantId!: number;
  @Column({ name: 'frutaId', type: 'integer' }) fruitId!: number;
  @ManyToOne(() => PlantEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'plantaId',
    foreignKeyConstraintName: 'FK_planta_fruta_planta',
  })
  plant!: Relation<PlantEntity>;
  @ManyToOne(() => FruitEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'frutaId',
    foreignKeyConstraintName: 'FK_planta_fruta_fruta',
  })
  fruit!: Relation<FruitEntity>;
}
