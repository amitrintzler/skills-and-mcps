import { logger } from '../lib/logger.js';
import { runCli } from '../interfaces/cli/index.js';

async function run(): Promise<void> {
  logger.warn('Deprecated script "ingest". Running "sync".');
  await runCli(['sync']);
}

run().catch((error) => {
  logger.error('Ingestion failed', error);
  process.exitCode = 1;
});
