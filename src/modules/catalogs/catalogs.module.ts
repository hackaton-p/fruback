import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FruitEntity } from './infrastructure/persistence/fruit.entity';
import { CustomerEntity } from './infrastructure/persistence/customer.entity';
import { AreaEntity } from './infrastructure/persistence/area.entity';
@Module({
  imports: [
    TypeOrmModule.forFeature([FruitEntity, CustomerEntity, AreaEntity]),
  ],
})
export class CatalogsModule {}
