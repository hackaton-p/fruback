import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '../../infrastructure/auth.service';
import type { RoleName } from '../../domain/enums';
import type { AuthenticatedRequest } from './auth.decorators';
import { ensure } from '../../../../shared/domain/domain-error';
import { trustedOrigins } from '../../infrastructure/better-auth.factory';
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly reflector: Reflector,
  ) {}
  async canActivate(context: ExecutionContext) {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>('public', targets))
      return true;
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const { fromNodeHeaders } = await import('better-auth/node');
    request.actor = await this.auth.getActor(fromNodeHeaders(request.headers));
    const roles = this.reflector.getAllAndOverride<RoleName[]>(
      'roles',
      targets,
    );
    ensure(
      !roles || roles.includes(request.actor.role),
      'Role access denied',
      403,
    );
    if (
      !['GET', 'HEAD', 'OPTIONS'].includes(request.method) &&
      !request.headers.authorization
    )
      ensure(
        typeof request.headers.origin === 'string' &&
          trustedOrigins().includes(request.headers.origin),
        'Trusted Origin required for cookie-authenticated writes',
        403,
      );
    return true;
  }
}
