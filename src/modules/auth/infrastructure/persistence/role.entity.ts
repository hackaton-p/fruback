import { Entity, Column, Check, Index } from 'typeorm';
import { BaseEntity } from '../../../../shared/infrastructure/persistence/base.entity';
import { RoleName } from '../../domain/enums';
@Entity('rol')
@Check('ck_rol_0', `"nombre" IN ('PLANIFICADOR', 'SUBGERENTE', 'JEFE_TURNO')`)
@Index('idx_rol_0', ['name'], { unique: true })
export class RoleEntity extends BaseEntity {
  @Column({ name: 'nombre', type: 'varchar', length: 255 }) name!: RoleName;
}
