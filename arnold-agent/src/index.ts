import { ArnoldAgent } from './agent';

const agent = new ArnoldAgent();

async function main() {
  await agent.start();

  const shutdown = async () => {
    await agent.shutdown();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  console.error('[main] Fatal error:', error);
  process.exit(1);
});
