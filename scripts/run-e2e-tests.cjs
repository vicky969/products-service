const expectedDatabaseName = 'ecommerce_test';
const testDatabaseName = process.env.E2E_DB_NAME;

if (testDatabaseName !== expectedDatabaseName) {
  console.error(
    `Integration tests refused: E2E_DB_NAME must be exactly ${expectedDatabaseName}; received ${testDatabaseName ?? '<unset>'}.`,
  );
  process.exit(1);
}

const { spawnSync } = require('node:child_process');
const { resolve } = require('node:path');
const jestPath = resolve(process.cwd(), 'node_modules/jest/bin/jest.js');

const result = spawnSync(
  process.execPath,
  [jestPath, '--selectProjects', 'integration', '--runInBand', ...process.argv.slice(2)],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DB_NAME: testDatabaseName,
      E2E_DB_NAME: testDatabaseName,
    },
    stdio: 'inherit',
  },
);

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);