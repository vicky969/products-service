describe('Task 0 integration harness', () => {
  it('loads with the isolated test database selected', () => {
    expect(process.env.DB_NAME).toBe('ecommerce_test');
  });
});