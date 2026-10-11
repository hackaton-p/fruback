import { UsersController } from './presentation/http/users.controller';
import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import {
  AUTH_RUNTIME,
  createBetterAuth,
} from './infrastructure/better-auth.factory';
import { AuthService } from './infrastructure/auth.service';
import { SessionGuard } from './presentation/http/session.guard';
@Global()
@Module({
  controllers: [UsersController],
  providers: [
    { provide: AUTH_RUNTIME, useFactory: createBetterAuth },
    AuthService,
    { provide: APP_GUARD, useClass: SessionGuard },
  ],
  exports: [AuthService],
})
export class AuthModule {}
