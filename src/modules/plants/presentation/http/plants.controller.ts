import {
  Body,
  Controller,
  Get,
  Patch,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import {
  CurrentActor,
  Roles,
} from '../../../auth/presentation/http/auth.decorators';
import type { Actor } from '../../../auth/domain/actor';
import { RoleName } from '../../../auth/domain/enums';
import { ApiProtected } from '../../../../shared/presentation/http/api.decorators';
import { PlantsService } from '../../application/plants.service';
import { ParameterOverridesDto } from '../../../../shared/presentation/http/request.dto';
import { PlantResponse } from '../../../../shared/presentation/http/response.dto';
@ApiTags('Plants')
@ApiProtected()
@Controller('plants')
export class PlantsController {
  constructor(private readonly service: PlantsService) {}
  @Get()
  @ApiOperation({ summary: 'List accessible plants' })
  @ApiOkResponse({ type: [PlantResponse] })
  list(@CurrentActor() actor: Actor) {
    return this.service.list(actor);
  }
  @Get(':id')
  @ApiOperation({ summary: 'Get plant configuration' })
  @ApiOkResponse({ type: PlantResponse })
  get(@Param('id', ParseIntPipe) id: number, @CurrentActor() actor: Actor) {
    return this.service.get(id, actor);
  }
  @Patch(':id')
  @Roles(RoleName.DEPUTY_MANAGER)
  @ApiOperation({ summary: 'Update defaults for future plans' })
  @ApiOkResponse({ type: PlantResponse })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ParameterOverridesDto,
    @CurrentActor() actor: Actor,
  ) {
    return this.service.update(id, body, actor);
  }
}
