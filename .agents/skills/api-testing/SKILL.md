---
name: api-testing
description: Design and run products-service Jest unit and real-MySQL HTTP integration tests with acceptance-criteria traceability. Use for feature verification, regression coverage, and test-safety work.
---

# API testing workflow

Read `AGENTS.md`, the relevant FR/AC/NFR requirements, decisions, and existing tests before changing tests. Use this alongside `sdd-workflow` or `nestjs-feature` for implementation tasks.

## Test at the right layer

- Start with failing tests for every affected acceptance criterion. Keep unit tests database-free: mock Sequelize models for service rules and use `plainToInstance` plus `validate` for DTO rules.
- Use Supertest against a Nest application for HTTP behavior: route/parameter parsing, shared validation, statuses, response shape, error messages, and serialization.
- Use the existing real-MySQL integration harness for persistence, collation, `UNSIGNED`, `DECIMAL`, constraints, and concurrency behavior. Set `E2E_DB_NAME=ecommerce_test`; the runner and Jest setup must reject every other database before connection or schema work. Never substitute SQLite.
- Follow current test-data patterns: create uniquely named records, track their tokens, clean them after each test, and close the Nest app after the suite. Use transactions and rollback where an integration check can be isolated that way.

## Assertions and coverage

- Cover positive, negative, boundary, concurrent where relevant, and regression cases. Assert the specified status, body shape/message, persisted effect, and absence of unintended changes; avoid assertions that only prove a call occurred when the HTTP contract matters.
- Keep AC-to-test traceability in `docs/DECISIONS.md` current when approved work changes coverage.
- Run relevant unit tests, `npm run build`, and guarded E2E tests. For executable changes, target at least 95% statements, branches, functions, and lines without excluding code, weakening assertions, or changing thresholds. Report baseline limitations honestly.
- Never delete, skip, weaken, or loosen an existing test to obtain a pass. Preserve API contracts unless an approved requirement changes them.

## Safety and handoff

- Do not log or assert secrets. Do not run E2E tests against `ecommerce` or any non-test database.
- Report exact commands, results, coverage, unrun checks, and database/Docker availability. Do not commit, push, merge, or open a pull request without explicit approval.
