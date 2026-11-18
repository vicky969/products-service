import { describe, expect, it } from '@jest/globals';
import { expectedDatabaseName, isSafeIntegrationDatabase } from '../../scripts/database-safety.cjs';

describe('Integration test database safety', () => {
  it('accepts only ecommerce_test', () => {
    expect(isSafeIntegrationDatabase(expectedDatabaseName)).toBe(true);
    expect(isSafeIntegrationDatabase('ecommerce')).toBe(false);
    expect(isSafeIntegrationDatabase('other_database')).toBe(false);
    expect(isSafeIntegrationDatabase(undefined)).toBe(false);
  });
});
