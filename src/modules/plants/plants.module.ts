import { Module } from '@nestjs/common';
import { PlantsService } from './application/plants.service';
import { PlantsController } from './presentation/http/plants.controller';
@Module({ providers: [PlantsService], controllers: [PlantsController] })
export class PlantsModule {}
