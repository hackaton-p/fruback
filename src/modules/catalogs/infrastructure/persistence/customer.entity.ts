import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../../../shared/infrastructure/persistence/base.entity';

@Entity('cliente')
export class CustomerEntity extends BaseEntity {
  @Column({ name: 'nombre', type: 'varchar', length: 255, unique: true })
  name!: string;
  @Column({ name: 'pais', type: 'varchar', length: 255 }) country!: string;
}
