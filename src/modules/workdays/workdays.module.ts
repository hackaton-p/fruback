import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkdayEntity } from './infrastructure/persistence/workday.entity';
import { ProgressRecordEntity } from './infrastructure/persistence/progress-record.entity';
@Module({
  imports: [TypeOrmModule.forFeature([WorkdayEntity, ProgressRecordEntity])],
})
export class WorkdaysModule {}
