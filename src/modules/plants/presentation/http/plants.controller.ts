import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiCreatedResponse, ApiNoContentResponse } from '@nestjs/swagger';
import {
  CurrentActor,
  Roles,
} from '../../../auth/presentation/http/auth.decorators';
import type { Actor } from '../../../auth/domain/actor';
import { RoleName } from '../../../auth/domain/enums';
import { ApiProtected } from '../../../../shared/presentation/http/api.decorators';
import { PlantsService } from '../../application/plants.service';
import { CatalogListQuery, ParameterOverridesDto, PlantCatalogDto } from '../../../../shared/presentation/http/request.dto';
import { PlantResponse } from '../../../../shared/presentation/http/response.dto';
@ApiTags('Plants')
@ApiProtected()
@Controller('plants')
export class PlantsController {
  constructor(private readonly service: PlantsService) {}
  @Get()
  @ApiOperation({ summary: 'List accessible plants' })
  @ApiOkResponse({ type: [PlantResponse] })
  list(@CurrentActor() actor: Actor, @Query() query: CatalogListQuery) {
    return this.service.list(actor, query.includeInactive);
  }
  @Post()
  @Roles(RoleName.ADMIN)
  @ApiOperation({ summary: 'Create a plant' })
  @ApiCreatedResponse({ type: PlantResponse })
  create(@Body() body: PlantCatalogDto) {
    return this.service.createCatalog(body);
  }
  @Get(':id')
  @ApiOperation({ summary: 'Get plant configuration' })
  @ApiOkResponse({ type: PlantResponse })
  get(@Param('id', ParseIntPipe) id: number, @CurrentActor() actor: Actor) {
    return this.service.get(id, actor);
  }
  @Patch(':id')
  @Roles(RoleName.ADMIN, RoleName.PLANNER, RoleName.DEPUTY_MANAGER, RoleName.SHIFT_MANAGER)
  @ApiOperation({ summary: 'Update defaults for future plans' })
  @ApiOkResponse({ type: PlantResponse })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ParameterOverridesDto,
    @CurrentActor() actor: Actor,
  ) {
    return this.service.update(id, body, actor);
  }
  @Patch(':id/catalog')
  @Roles(RoleName.ADMIN)
  @ApiOperation({ summary: 'Edit plant catalog details and defaults' })
  @ApiOkResponse({ type: PlantResponse })
  updateCatalog(@Param('id', ParseIntPipe) id: number, @Body() body: PlantCatalogDto) {
    return this.service.updateCatalog(id, body);
  }
  @Delete(':id')
  @Roles(RoleName.ADMIN)
  @HttpCode(204)
  @ApiOperation({ summary: 'Deactivate a plant without deleting its records' })
  @ApiNoContentResponse()
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.service.deactivate(id);
  }
}
