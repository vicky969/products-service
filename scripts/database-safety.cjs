const expectedDatabaseName = 'ecommerce_test';

function isSafeIntegrationDatabase(databaseName) {
  return databaseName === expectedDatabaseName;
}

module.exports = { expectedDatabaseName, isSafeIntegrationDatabase };
