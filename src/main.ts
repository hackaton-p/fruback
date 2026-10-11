import { createApplication } from './application';
async function bootstrap() {
  const { app } = await createApplication();
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
void bootstrap();
