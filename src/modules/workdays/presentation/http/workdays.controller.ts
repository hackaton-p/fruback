import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import {
  CurrentActor,
  Roles,
} from '../../../auth/presentation/http/auth.decorators';
import type { Actor } from '../../../auth/domain/actor';
import { RoleName } from '../../../auth/domain/enums';
import {
  ApiProtected,
  ApiPage,
} from '../../../../shared/presentation/http/api.decorators';
import { WorkdaysService } from '../../application/workdays.service';
import {
  OpenWorkdayDto,
  EstimateWorkdayQuery,
  ProgressDto,
  CloseWorkdayDto,
  WorkdayQuery,
  AdjustHoursDto,
  WeekQuery,
} from '../../../../shared/presentation/http/request.dto';
import {
  WorkdayResponse,
  WorkdayEstimateResponse,
  WorkdayDetailsResponse,
  WorkdayListResponse,
  ProgressResultResponse,
  PlanDayResponse,
  DashboardResponse,
} from '../../../../shared/presentation/http/response.dto';
@ApiTags('Execution')
@ApiProtected()
@Controller()
export class WorkdaysController {
  constructor(private readonly service: WorkdaysService) {}
  @Get('workdays')
  @ApiOperation({ summary: 'List workdays by plant, date or plan' })
  @ApiPage(WorkdayListResponse)
  list(@Query() query: WorkdayQuery, @CurrentActor() actor: Actor) {
    return this.service.list(query, actor);
  }
  @Get('workdays/estimate')
  @ApiOperation({
    summary: 'Estimate opening hours and end time without saving',
  })
  @ApiOkResponse({ type: WorkdayEstimateResponse })
  estimate(@Query() query: EstimateWorkdayQuery, @CurrentActor() actor: Actor) {
    return this.service.estimate(query, actor);
  }
  @Get('workdays/:id')
  @ApiOperation({
    summary: 'Get attendance, progress, alerts and estimated hours',
  })
  @ApiOkResponse({ type: WorkdayDetailsResponse })
  get(@Param('id', ParseIntPipe) id: number, @CurrentActor() actor: Actor) {
    return this.service.get(id, actor);
  }
  @Post('workdays')
  @Roles(RoleName.SHIFT_MANAGER)
  @ApiOperation({
    summary: 'Open one workday for an approved plan day',
    description:
      'Attendance must include all planned areas. startedAt must be on the planned date in America/Lima and not in the future.',
  })
  @ApiCreatedResponse({ type: WorkdayResponse })
  open(@Body() body: OpenWorkdayDto, @CurrentActor() actor: Actor) {
    return this.service.open(body, actor);
  }
  @Post('workdays/:id/records')
  @Roles(RoleName.SHIFT_MANAGER)
  @ApiOperation({
    summary: 'Record AVANCE, PERSONAL or VOLUMEN and snapshot estimated hours',
    description:
      'Send only the fields for the selected type. Events can share a timestamp and are ordered by id. AVANCE uses cumulative crates; PERSONAL applies a signed change to one area; VOLUMEN replaces expected daily crates.',
  })
  @ApiCreatedResponse({ type: ProgressResultResponse })
  progress(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ProgressDto,
    @CurrentActor() actor: Actor,
  ) {
    return this.service.progress(id, body, actor);
  }
  @Post('workdays/:id/close')
  @HttpCode(200)
  @Roles(RoleName.SHIFT_MANAGER)
  @ApiOperation({
    summary: 'Close a workday and close its plan when all days are closed',
  })
  @ApiOkResponse({ type: WorkdayResponse })
  close(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CloseWorkdayDto,
    @CurrentActor() actor: Actor,
  ) {
    return this.service.close(id, body, actor);
  }
  @Patch('plan-days/:id/hours')
  @Roles(RoleName.SHIFT_MANAGER)
  @ApiOperation({
    summary: 'Adjust hours during execution without changing the target',
  })
  @ApiOkResponse({ type: PlanDayResponse })
  adjust(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: AdjustHoursDto,
    @CurrentActor() actor: Actor,
  ) {
    return this.service.adjust(id, body, actor);
  }
  @Get('dashboard')
  @ApiTags('Dashboard')
  @ApiOperation({
    summary: 'Get weekly KPIs and daily projected versus executed data',
    description:
      'No line-position or occupancy metrics: these are excluded from the MVP model. Ratios return null when the denominator is zero.',
  })
  @ApiOkResponse({ type: DashboardResponse })
  dashboard(@Query() query: WeekQuery, @CurrentActor() actor: Actor) {
    return this.service.dashboard(query, actor);
  }
}
