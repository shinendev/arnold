/**
 * PM2 config for VPS (/opt/arnold). Run: pm2 start /opt/arnold/ecosystem.config.js
 * Each app loads .env from its cwd via dotenv (arnold api) / existing dotenv (agent).
 */
module.exports = {
  apps: [
    {
      name: 'arnold-api',
      cwd: '/opt/arnold/arnold',
      script: 'node_modules/.bin/tsx',
      args: 'src/api.ts',
      env: { NODE_ENV: 'production', PORT: '3210' },
    },
    {
      name: 'arnold-agent',
      cwd: '/opt/arnold/arnold-agent',
      script: 'node_modules/.bin/tsx',
      args: 'src/index.ts',
      env: { NODE_ENV: 'production' },
    },
  ],
};
