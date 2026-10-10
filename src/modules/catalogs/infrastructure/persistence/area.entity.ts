import { Entity, Column, Check } from 'typeorm';
import { BaseEntity } from '../../../../shared/infrastructure/persistence/base.entity';

@Entity('area')
@Check('ck_area_0', `"proporcion" BETWEEN 0 AND 1`)
export class AreaEntity extends BaseEntity {
  @Column({ name: 'nombre', type: 'varchar', length: 255, unique: true })
  name!: string;
  @Column({ name: 'proporcion', type: 'numeric', precision: 14, scale: 4 })
  proportion!: string;
}
