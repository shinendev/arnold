"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const agent_1 = require("./agent");
const agent = new agent_1.ArnoldAgent();
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
//# sourceMappingURL=index.js.map