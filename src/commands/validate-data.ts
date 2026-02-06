import { logger } from '../lib/logger.js';
import { runCli } from '../interfaces/cli/index.js';

async function run(): Promise<void> {
  logger.warn('Deprecated script "validate:data". Running "whitelist verify".');
  await runCli(['whitelist', 'verify']);
}

run().catch((error) => {
  logger.error(error instanceof Error ? error.message : 'Validation command failed');
  process.exitCode = 1;
});
