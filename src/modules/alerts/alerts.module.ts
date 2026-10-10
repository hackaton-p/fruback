import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertEntity } from './infrastructure/persistence/alert.entity';
@Module({ imports: [TypeOrmModule.forFeature([AlertEntity])] })
export class AlertsModule {}
