import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectionEntity } from './infrastructure/persistence/projection.entity';
@Module({ imports: [TypeOrmModule.forFeature([ProjectionEntity])] })
export class ProjectionsModule {}
