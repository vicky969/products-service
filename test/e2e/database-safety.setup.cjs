const expectedDatabaseName = 'ecommerce_test';
const testDatabaseName = process.env.E2E_DB_NAME;

if (testDatabaseName !== expectedDatabaseName) {
  throw new Error(`E2E_DB_NAME must be exactly ${expectedDatabaseName}`);
}

process.env.DB_NAME = testDatabaseName;