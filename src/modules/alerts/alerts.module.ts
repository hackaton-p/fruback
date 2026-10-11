import { Module } from '@nestjs/common';
import { AlertsService } from './application/alerts.service';
import { AlertsController } from './presentation/http/alerts.controller';
@Module({ providers: [AlertsService], controllers: [AlertsController] })
export class AlertsModule {}
