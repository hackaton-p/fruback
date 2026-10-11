import {
  Body,
  Controller,
  Get,
  Post,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  Patch,
  Delete,
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
import { ApiProtected } from '../../../../shared/presentation/http/api.decorators';
import { PlansService } from '../../application/plans.service';
import { PlanStatus } from '../../domain/enums';
import {
  CreatePlanDto,
  PlanQuery,
  RejectPlanDto,
} from '../../../../shared/presentation/http/request.dto';
import {
  PlanDetailsResponse,
  PlanListResponse,
  SimulationResponse,
} from '../../../../shared/presentation/http/response.dto';
@ApiTags('Plans')
@ApiProtected()
@Controller('plans')
export class PlansController {
  constructor(private readonly service: PlansService) {}
  @Patch(':id')
  @Roles(RoleName.PLANNER)
  @ApiOperation({
    summary: 'Update a draft or rejected plan without changing its period',
  })
  @ApiOkResponse({ type: PlanDetailsResponse })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CreatePlanDto,
    @CurrentActor() actor: Actor,
  ) {
    return this.service.apply(body, actor, id);
  }
  @Delete(':id')
  @HttpCode(204)
  @Roles(RoleName.PLANNER)
  @ApiOperation({ summary: 'Discard an unsubmitted or rejected plan' })
  discard(@Param('id', ParseIntPipe) id: number, @CurrentActor() actor: Actor) {
    return this.service.discard(id, actor);
  }
  @Post('simulate')
  @HttpCode(200)
  @Roles(RoleName.PLANNER)
  @ApiOperation({ summary: 'Calculate a simulation without persisting it' })
  @ApiOkResponse({ type: SimulationResponse })
  simulate(@Body() body: CreatePlanDto, @CurrentActor() actor: Actor) {
    return this.service.simulate(body, actor);
  }
  @Post()
  @Roles(RoleName.PLANNER)
  @ApiOperation({
    summary:
      'Apply the official draft with daily staffing and parameter snapshot',
  })
  @ApiCreatedResponse({ type: PlanDetailsResponse })
  apply(@Body() body: CreatePlanDto, @CurrentActor() actor: Actor) {
    return this.service.apply(body, actor);
  }
  @Get()
  @ApiOperation({ summary: 'List plans, days and calculated totals' })
  @ApiOkResponse({ type: PlanListResponse })
  list(@Query() query: PlanQuery, @CurrentActor() actor: Actor) {
    return this.service.list(query, actor);
  }
  @Get(':id')
  @ApiOperation({ summary: 'Get plan detail and execution progress' })
  @ApiOkResponse({ type: PlanDetailsResponse })
  get(@Param('id', ParseIntPipe) id: number, @CurrentActor() actor: Actor) {
    return this.service.get(id, actor);
  }
  @Post(':id/submit')
  @HttpCode(200)
  @Roles(RoleName.PLANNER)
  @ApiOperation({ summary: 'Submit a draft for approval' })
  @ApiOkResponse({ type: PlanDetailsResponse })
  submit(@Param('id', ParseIntPipe) id: number, @CurrentActor() actor: Actor) {
    return this.service.transition(id, PlanStatus.PENDING, actor);
  }
  @Post(':id/approve')
  @HttpCode(200)
  @Roles(RoleName.DEPUTY_MANAGER)
  @ApiOperation({ summary: 'Approve a pending plan' })
  @ApiOkResponse({ type: PlanDetailsResponse })
  approve(@Param('id', ParseIntPipe) id: number, @CurrentActor() actor: Actor) {
    return this.service.transition(id, PlanStatus.APPROVED, actor);
  }
  @Post(':id/reject')
  @HttpCode(200)
  @Roles(RoleName.DEPUTY_MANAGER)
  @ApiOperation({ summary: 'Reject a pending plan with a required comment' })
  @ApiOkResponse({ type: PlanDetailsResponse })
  reject(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: RejectPlanDto,
    @CurrentActor() actor: Actor,
  ) {
    return this.service.transition(
      id,
      PlanStatus.REJECTED,
      actor,
      body.comment,
    );
  }
}
