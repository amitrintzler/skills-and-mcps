import { logger } from './lib/logger.js';
import { runCli } from './interfaces/cli/index.js';

const [command = 'help', ...rest] = process.argv.slice(2);

async function run(): Promise<void> {
  if (command === 'ingest') {
    logger.warn('Deprecated command "ingest". Use "sync" instead.');
    await runCli(['sync']);
    return;
  }

  if (command === 'validate') {
    logger.warn('Deprecated command "validate". Use "whitelist verify" instead.');
    await runCli(['whitelist', 'verify']);
    return;
  }

  await runCli([command, ...rest]);
}

run().catch((error) => {
  logger.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
