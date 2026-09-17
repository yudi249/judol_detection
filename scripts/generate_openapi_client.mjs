import { spawnSync } from 'node:child_process';
const result = spawnSync(
  'pnpm',
  [
    '--dir',
    'apps/browser-extension',
    'exec',
    'openapi-typescript',
    '../../contracts/judollens-api.openapi.yaml',
    '-o',
    'src/api/generated/schema.ts',
  ],
  {
    cwd: new URL('..', import.meta.url),
    encoding: 'utf8',
    stdio: 'inherit',
    shell: process.platform === 'win32',
  },
);

process.exitCode = result.status ?? 1;
