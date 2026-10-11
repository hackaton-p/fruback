import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { AuthService } from '../modules/auth/infrastructure/auth.service';
import { RoleName } from '../modules/auth/domain/enums';
import { DataSource } from 'typeorm';
import { ensure } from '../shared/domain/domain-error';

async function bootstrap() {
  const email = process.env.BOOTSTRAP_EMAIL;
  const password = process.env.BOOTSTRAP_PASSWORD;
  const name = process.env.BOOTSTRAP_NAME ?? 'Packing administrator';
  ensure(
    email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    'BOOTSTRAP_EMAIL is required',
  );
  ensure(
    password && password.length >= 12 && Buffer.byteLength(password) <= 72,
    'BOOTSTRAP_PASSWORD must be at least 12 characters and at most 72 UTF-8 bytes',
  );
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  try {
    const source = app.get(DataSource);
    await source.transaction(async (manager) => {
      await manager.query(
        "SELECT pg_advisory_xact_lock(hashtext('packing-bootstrap-user'))",
      );
      const rows = await manager.query<{ count: string }[]>(
        'SELECT count(*) FROM usuario WHERE "authUserId" IS NOT NULL',
      );
      ensure(
        Number(rows[0].count) === 0,
        'Bootstrap is only available before the first authenticated user exists',
        409,
      );
      const user = await app
        .get(AuthService)
        .createUser({ email, password, name, role: RoleName.ADMIN });
      console.log(`Created admin ${user.email} (id ${user.id})`);
    });
  } finally {
    await app.close();
  }
}
void bootstrap().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Bootstrap failed');
  process.exitCode = 1;
});
