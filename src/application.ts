import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { OpenAPIObject } from '@nestjs/swagger';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';
import { AuthService } from './modules/auth/infrastructure/auth.service';
import {
  AUTH_PATHS,
  trustedOrigins,
} from './modules/auth/infrastructure/better-auth.factory';
import { ApiErrorFilter } from './shared/presentation/http/api-error.filter';

export async function createApplication() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
    logger: process.env.NODE_ENV === 'test' ? false : undefined,
  });
  app.enableShutdownHooks();
  app.enableCors({
    origin: trustedOrigins(),
    credentials: true,
    exposedHeaders: ['set-auth-token'],
  });
  app.setGlobalPrefix('api');
  const auth = app.get(AuthService).runtime.auth;
  const { toNodeHandler } = await import('better-auth/node');
  const handler = toNodeHandler(auth);
  app.use(
    '/api/auth',
    (request: Request, response: Response, next: NextFunction) => {
      const path = request.path.replace(/\/$/, '');
      if (!AUTH_PATHS.includes(path)) {
        response.status(404).json({
          statusCode: 404,
          message: 'Authentication route not exposed',
        });
        return;
      }
      void Promise.resolve(handler(request, response)).catch(next);
    },
  );
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: false, limit: '1mb' }));
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new ApiErrorFilter());
  const config = new DocumentBuilder()
    .setTitle('Pura Fruit Packing API')
    .setVersion('1.0.0')
    .setDescription(
      'Packing MVP. Sign in at /api/auth/sign-in/email; use its session token as a Bearer token or the HttpOnly session cookie. Cookie-authenticated writes require a trusted Origin. Enum wire values preserve the business specification. Decimal quantities are returned as strings.',
    )
    .addBearerAuth()
    .addCookieAuth(
      'better-auth.session_token',
      { type: 'apiKey', in: 'cookie' },
      'session',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  const authDocument = await auth.api.generateOpenAPISchema();
  const authSchema = authDocument as unknown as OpenAPIObject;
  for (const [path, definition] of Object.entries(authSchema.paths)) {
    const relative = path.replace(/^\/api\/auth/, '');
    if (AUTH_PATHS.includes(relative))
      document.paths[`/api/auth${relative}`] = definition;
  }
  document.components = {
    ...document.components,
    schemas: {
      ...authSchema.components?.schemas,
      ...document.components?.schemas,
    },
    securitySchemes: {
      ...authSchema.components?.securitySchemes,
      ...document.components?.securitySchemes,
    },
  };
  app.use('/openapi.json', (_request: Request, response: Response) =>
    response.json(document),
  );
  const { apiReference } = await import('@scalar/nestjs-api-reference');
  app.use(
    '/docs',
    apiReference({
      url: '/openapi.json',
      theme: 'default',
      persistAuth: false,
    }),
  );
  return { app, document };
}
