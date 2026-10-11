import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CurrentActor } from '../../../auth/presentation/http/auth.decorators';
import type { Actor } from '../../../auth/domain/actor';
import {
  ApiProtected,
  ApiPage,
} from '../../../../shared/presentation/http/api.decorators';
import { AlertsService } from '../../application/alerts.service';
import { AlertQuery } from '../../../../shared/presentation/http/request.dto';
import { AlertResponse } from '../../../../shared/presentation/http/response.dto';
@ApiTags('Alerts')
@ApiProtected()
@Controller('alerts')
export class AlertsController {
  constructor(private readonly service: AlertsService) {}
  @Get()
  @ApiOperation({
    summary: 'List generated alerts',
    description:
      'date filters the planned operating date, including progress after midnight.',
  })
  @ApiPage(AlertResponse)
  list(@Query() query: AlertQuery, @CurrentActor() actor: Actor) {
    return this.service.list(query, actor);
  }
}
