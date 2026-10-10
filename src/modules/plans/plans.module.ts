import { PlanCalculatorService } from './domain/services/plan-calculator.service';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanEntity } from './infrastructure/persistence/plan.entity';
import { PlanDayEntity } from './infrastructure/persistence/plan-day.entity';
import { PlanDayAreaEntity } from './infrastructure/persistence/plan-day-area.entity';
@Module({
  providers: [PlanCalculatorService],
  exports: [PlanCalculatorService],
  imports: [
    TypeOrmModule.forFeature([PlanEntity, PlanDayEntity, PlanDayAreaEntity]),
  ],
})
export class PlansModule {}
