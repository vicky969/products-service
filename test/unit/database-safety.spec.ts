import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

describe('integration database safety', () => {
  it('rejects an incorrect database before Jest starts', () => {
    const runnerPath = resolve(process.cwd(), 'scripts/run-e2e-tests.cjs');
    const result = spawnSync(process.execPath, [runnerPath], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: { ...process.env, E2E_DB_NAME: 'ecommerce' },
    });
    const output = `${result.stdout}${result.stderr}`;

    expect(result.status).toBe(1);
    expect(output).toContain('E2E_DB_NAME must be exactly ecommerce_test');
    expect(output).not.toMatch(/Test Suites:|PASS |FAIL /);
  });
});