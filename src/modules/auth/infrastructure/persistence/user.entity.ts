import { Entity, Column, Index, JoinColumn, ManyToMany, ManyToOne, JoinTable } from 'typeorm';
import type { Relation } from 'typeorm';
import { BaseEntity } from '../../../../shared/infrastructure/persistence/base.entity';

import { RoleEntity } from './role.entity';
import { PlantEntity } from '../../../plants/infrastructure/persistence/plant.entity';
@Entity('usuario')
@Index('idx_usuario_0', ['plantId'])
export class UserEntity extends BaseEntity {
  @Column({ name: 'rolId', type: 'integer' }) roleId!: number;
  @ManyToOne(() => RoleEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'rolId' })
  role!: Relation<RoleEntity>;
  @Column({ name: 'plantaId', type: 'integer', nullable: true }) plantId!:
    number | null;
  @ManyToOne(() => PlantEntity, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'plantaId' })
  plant!: Relation<PlantEntity> | null;
  @ManyToMany(() => PlantEntity)
  @JoinTable({
    name: 'usuario_planta',
    joinColumn: { name: 'usuarioId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'plantaId', referencedColumnName: 'id' },
  })
  plants!: Relation<PlantEntity[]>;
  @Column({ name: 'nombre', type: 'varchar', length: 255 }) name!: string;
  @Column({ type: 'varchar', length: 255, unique: true }) email!: string;
  @Column({ type: 'varchar', length: 255, select: false, nullable: true })
  passwordHash!: string | null;
  @Column({ type: 'text', unique: true, nullable: true }) authUserId!:
    string | null;
}
