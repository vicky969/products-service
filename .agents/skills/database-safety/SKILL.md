---
name: database-safety
description: Safely design, review, or change products-service Sequelize and MySQL persistence while preserving schema ownership, data integrity, and test-database isolation.
---

# Database safety workflow

Read `AGENTS.md`, the applicable data-model requirements, D-2/D-4/D-5/D-8/D-10 decisions, `db/init.sql`, model/service code, and database tests before changing persistence. Stop for an ambiguous data rule, schema change, destructive operation, or unapproved dependency.

## Persistence rules

- Keep the checked-in SQL script as the schema source. Sequelize `synchronize` remains `false`; model decorators/types describe the approved schema rather than changing it.
- Use `sequelize-typescript` models with explicit attributes and creation attributes. Perform persistence through structured ORM operations and fixed identifiers; never interpolate request data into raw SQL or let a request choose columns, order clauses, or SQL fragments.
- If reviewed raw SQL is unavoidable, use Sequelize bind/replacement parameters and add focused tests. The existing test-only raw queries are not a precedent for production raw SQL.
- Treat DTO validation and database constraints as separate layers: validate shape/range at the HTTP boundary, and retain database primary, unique, type, collation, and check constraints for integrity and concurrency.
- Map expected database errors such as unique-constraint violations to the specified Nest HTTP exception. Rethrow unexpected persistence errors for the generic exception handling path; do not expose SQL details.

## Data integrity

- Preserve `productToken` binary-collation uniqueness, `DECIMAL(10,2)` prices as strings, unsigned stock constraints, and no implicit stock default unless an approved requirement changes them.
- Use transactions when one business rule spans multiple writes or requires all-or-nothing behavior. Define the isolation/concurrency expectation first; do not add transactions speculatively.
- Avoid destructive operations. Verify exact targets before truncate, migration, delete, or schema changes; seek approval where required. Test cleanup must remain confined to records created by the test or to the isolated test database.

## Verification

- Add unit tests for service error mapping/query options and real-MySQL E2E tests for MySQL-specific behavior. Integration tests may use only `E2E_DB_NAME=ecommerce_test`; preserve the fail-closed guard.
- Run build, relevant unit/E2E regression tests, and coverage for executable changes. Target at least 95% statements, branches, functions, and lines without weakening tests or thresholds; report baseline limitations separately.
- Review the diff for schema/API-contract drift, unsafe SQL, secret exposure, and unintended data operations. Update approved documentation and decisions when required; do not commit or push without approval.
