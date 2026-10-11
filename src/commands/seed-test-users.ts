import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { AuthService } from '../modules/auth/infrastructure/auth.service';
import { PackingStore } from '../shared/application/packing.store';
import { RoleName } from '../modules/auth/domain/enums';

const PASSWORD = 'Packing-test-password-2026';

const USERS = [
  {
    name: 'Planificador de prueba',
    email: 'planner-test@purafruit.test',
    role: RoleName.PLANNER,
    needsPlant: true,
  },
  {
    name: 'Subgerente de prueba',
    email: 'deputy-manager-test@purafruit.test',
    role: RoleName.DEPUTY_MANAGER,
    needsPlant: false,
  },
  {
    name: 'Jefe de turno de prueba',
    email: 'shift-manager-test@purafruit.test',
    role: RoleName.SHIFT_MANAGER,
    needsPlant: true,
  },
];

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  try {
    const auth = app.get(AuthService);
    const store = app.get(PackingStore);
    const [plant] = await store.find('plants', undefined, {
      orderBy: 'id',
      direction: 'ASC',
      take: 1,
    });
    if (!plant) throw new Error('No plant found to assign scoped test users');
    for (const definition of USERS) {
      const existing = await store.find('users', { email: definition.email });
      if (existing.length) {
        console.log(`Skipped ${definition.email} (already exists)`);
        continue;
      }
      const user = await auth.createUser({
        name: definition.name,
        email: definition.email,
        password: PASSWORD,
        role: definition.role,
        plantId: definition.needsPlant ? plant.id : undefined,
      });
      console.log(`Created ${definition.role} ${user.email} (id ${user.id})`);
    }
    console.log(`Test password for all seeded users: ${PASSWORD}`);
  } finally {
    await app.close();
  }
}
void bootstrap().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Seed failed');
  process.exitCode = 1;
});
