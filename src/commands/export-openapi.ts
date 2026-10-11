import 'dotenv/config';
import { mkdir, writeFile } from 'node:fs/promises';
import { createApplication } from '../application';
async function exportDocument() {
  const { app, document } = await createApplication();
  try {
    await mkdir('docs', { recursive: true });
    await writeFile(
      'docs/openapi.json',
      JSON.stringify(document, null, 2) + '\n',
    );
  } finally {
    await app.close();
  }
}
void exportDocument().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
