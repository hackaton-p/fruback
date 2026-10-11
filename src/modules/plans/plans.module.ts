import { Module } from '@nestjs/common';
import { PlansService } from './application/plans.service';
import { PlansController } from './presentation/http/plans.controller';
@Module({ providers: [PlansService], controllers: [PlansController] })
export class PlansModule {}
