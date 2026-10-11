import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import type { Request } from 'express';
import type { Actor } from '../../domain/actor';
import type { RoleName } from '../../domain/enums';
export const Public = () => SetMetadata('public', true);
export const Roles = (...roles: RoleName[]) => SetMetadata('roles', roles);
export type AuthenticatedRequest = Request & { actor: Actor };
export const CurrentActor = createParamDecorator(
  (_data: unknown, context: ExecutionContext): Actor =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().actor,
);
