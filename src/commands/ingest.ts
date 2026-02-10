import { logger } from '../lib/logger.js';
import { runCli } from '../interfaces/cli/index.js';

async function run(): Promise<void> {
  const args = process.argv.slice(2);
  logger.warn(`Deprecated script "ingest". Forwarding to "sync" with args: ${args.join(' ')}`);
  await runCli(['sync', ...args]);
}

run().catch((error) => {
  logger.error('Ingestion failed', error);
  process.exitCode = 1;
});
