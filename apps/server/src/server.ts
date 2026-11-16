
import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectPrisma } from './config/prisma.js';
import { startCitadelWorker } from './jobs/citadelWorker.js';
import { startScoreWorker } from './jobs/scoreWorker.js';

async function main(): Promise<void> {
  await connectPrisma();

  // Both run in-process alongside the API for now.
  startCitadelWorker();
  startScoreWorker();

  const app = createApp();
  app.listen(env.port, () => {
    console.log(`Forge Loom API listening on port ${env.port}`);
  });
}

main().catch((error: unknown) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
