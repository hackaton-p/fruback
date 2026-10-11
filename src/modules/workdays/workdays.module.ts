import { Module } from '@nestjs/common';
import { WorkdaysService } from './application/workdays.service';
import { WorkdaysController } from './presentation/http/workdays.controller';
@Module({ providers: [WorkdaysService], controllers: [WorkdaysController] })
export class WorkdaysModule {}
