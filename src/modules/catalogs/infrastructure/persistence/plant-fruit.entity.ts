import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../../shared/infrastructure/persistence/base.entity';

@Entity('planta_fruta')
@Index('uq_planta_fruta', ['plantId', 'fruitId'], { unique: true })
export class PlantFruitEntity extends BaseEntity {
  @Column({ name: 'plantaId', type: 'integer' }) plantId!: number;
  @Column({ name: 'frutaId', type: 'integer' }) fruitId!: number;
}
