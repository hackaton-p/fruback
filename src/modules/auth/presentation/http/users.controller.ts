import { Body, Controller, Get, Post, Query } from '@nestjs/common';
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
import { AuthService } from '../../infrastructure/auth.service';
import {
  CreateUserDto,
  PlantFilterQuery,
} from '../../../../shared/presentation/http/request.dto';
import { ActorResponse } from '../../../../shared/presentation/http/response.dto';
import { PackingStore } from '../../../../shared/application/packing.store';
import { scopedPlant } from '../../domain/actor';
import { paginate } from '../../../../shared/application/pagination';
@ApiTags('Users')
@ApiProtected()
@Controller('users')
export class UsersController {
  constructor(
    private readonly auth: AuthService,
    private readonly store: PackingStore,
  ) {}
  @Get('me')
  @ApiOperation({ summary: 'Get the authenticated packing profile' })
  @ApiOkResponse({ type: ActorResponse })
  me(@CurrentActor() actor: Actor) {
    return actor;
  }
  @Post()
  @Roles(RoleName.DEPUTY_MANAGER)
  @ApiOperation({
    summary: 'Provision an email/password user and assign a role and plant',
    description:
      'No public registration. Only a global deputy manager can provision users without a plant. Password: 12–72 characters and at most 72 UTF-8 bytes.',
  })
  @ApiCreatedResponse({ type: ActorResponse })
  create(@Body() body: CreateUserDto, @CurrentActor() actor: Actor) {
    return this.auth.createUser(body, actor);
  }
  @Get()
  @Roles(RoleName.DEPUTY_MANAGER)
  @ApiOperation({ summary: 'List users in accessible plants' })
  @ApiPage(ActorResponse)
  async list(@Query() query: PlantFilterQuery, @CurrentActor() actor: Actor) {
    const roles = await this.store.find('roles');
    const users = await this.store.find('users', {
      plantId: scopedPlant(actor, query.plantId),
    });
    return paginate(
      users.map((user) => ({
        id: user.id,
        authUserId: user.authUserId,
        name: user.name,
        email: user.email,
        plantId: user.plantId,
        role: roles.find((r) => r.id === user.roleId)!.name,
      })),
      query,
    );
  }
}
