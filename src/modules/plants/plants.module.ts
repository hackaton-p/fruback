import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlantEntity } from './infrastructure/persistence/plant.entity';
@Module({ imports: [TypeOrmModule.forFeature([PlantEntity])] })
export class PlantsModule {}
