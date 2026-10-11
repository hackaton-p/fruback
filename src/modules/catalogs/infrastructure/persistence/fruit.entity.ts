import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../../../shared/infrastructure/persistence/base.entity';

@Entity('fruta')
export class FruitEntity extends BaseEntity {
  @Column({ name: 'nombre', type: 'varchar', length: 255, unique: true })
  name!: string;
  @Column({ name: 'activo', type: 'boolean', default: true })
  isActive!: boolean;
}
