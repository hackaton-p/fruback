import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
  ApiNoContentResponse,
} from '@nestjs/swagger';
import { Roles } from '../../../auth/presentation/http/auth.decorators';
import { CurrentActor } from '../../../auth/presentation/http/auth.decorators';
import type { Actor } from '../../../auth/domain/actor';
import { RoleName } from '../../../auth/domain/enums';
import {
  ApiProtected,
  ApiPage,
} from '../../../../shared/presentation/http/api.decorators';
import { CatalogsService } from '../../application/catalogs.service';
import {
  PaginationQuery,
  CustomerDto,
  UpdateCustomerDto,
  CatalogListQuery,
  FruitCatalogDto,
} from '../../../../shared/presentation/http/request.dto';
import {
  FruitResponse,
  AreaResponse,
  CustomerResponse,
} from '../../../../shared/presentation/http/response.dto';
@ApiTags('Catalogs')
@ApiProtected()
@Controller()
export class CatalogsController {
  constructor(private readonly service: CatalogsService) {}
  @Get('fruits')
  @ApiOperation({ summary: 'List fruits' })
  @ApiOkResponse({ type: [FruitResponse] })
  fruits(@Query() query: CatalogListQuery, @CurrentActor() actor: Actor) {
    return this.service.fruits(query.plantId, query.includeInactive, actor);
  }
  @Get('fruits/:id')
  @ApiOperation({ summary: 'Get a fruit, including inactive fruits for historical plans' })
  @ApiOkResponse({ type: FruitResponse })
  fruit(@Param('id', ParseIntPipe) id: number) {
    return this.service.fruit(id);
  }
  @Post('fruits')
  @Roles(RoleName.ADMIN, RoleName.SHIFT_MANAGER, RoleName.DEPUTY_MANAGER)
  @ApiOperation({ summary: 'Create a fruit and assign it to plants' })
  @ApiCreatedResponse({ type: FruitResponse })
  createFruit(@Body() body: FruitCatalogDto, @CurrentActor() actor: Actor) {
    return this.service.saveFruit(body, actor);
  }
  @Patch('fruits/:id')
  @Roles(RoleName.ADMIN, RoleName.SHIFT_MANAGER, RoleName.DEPUTY_MANAGER)
  @ApiOperation({ summary: 'Edit a fruit and its plant assignments' })
  @ApiOkResponse({ type: FruitResponse })
  updateFruit(@Param('id', ParseIntPipe) id: number, @Body() body: FruitCatalogDto, @CurrentActor() actor: Actor) {
    return this.service.saveFruit(body, actor, id);
  }
  @Delete('fruits/:id')
  @Roles(RoleName.ADMIN, RoleName.SHIFT_MANAGER, RoleName.DEPUTY_MANAGER)
  @HttpCode(204)
  @ApiNoContentResponse()
  deactivateFruit(@Param('id', ParseIntPipe) id: number) {
    return this.service.deactivateFruit(id);
  }
  @Get('areas')
  @ApiOperation({ summary: 'List staffing areas' })
  @ApiOkResponse({ type: [AreaResponse] })
  areas() {
    return this.service.areas();
  }
  @Get('customers')
  @ApiOperation({ summary: 'List customers' })
  @ApiPage(CustomerResponse)
  customers(@Query() query: PaginationQuery) {
    return this.service.customers(query);
  }
  @Get('customers/:id')
  @ApiOperation({ summary: 'Get a customer' })
  @ApiOkResponse({ type: CustomerResponse })
  customer(@Param('id', ParseIntPipe) id: number) {
    return this.service.customer(id);
  }
  @Post('customers')
  @Roles(RoleName.PLANNER, RoleName.DEPUTY_MANAGER)
  @ApiOperation({ summary: 'Create a customer' })
  @ApiCreatedResponse({ type: CustomerResponse })
  create(@Body() body: CustomerDto) {
    return this.service.save(body);
  }
  @Patch('customers/:id')
  @Roles(RoleName.PLANNER, RoleName.DEPUTY_MANAGER)
  @ApiOperation({ summary: 'Update a customer' })
  @ApiOkResponse({ type: CustomerResponse })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateCustomerDto,
  ) {
    return this.service.save(body, id);
  }
  @Delete('customers/:id')
  @Roles(RoleName.PLANNER, RoleName.DEPUTY_MANAGER)
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete an unused customer' })
  @ApiNoContentResponse()
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
