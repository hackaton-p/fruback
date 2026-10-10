import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleEntity } from './infrastructure/persistence/role.entity';
import { UserEntity } from './infrastructure/persistence/user.entity';
@Module({ imports: [TypeOrmModule.forFeature([RoleEntity, UserEntity])] })
export class AuthModule {}
