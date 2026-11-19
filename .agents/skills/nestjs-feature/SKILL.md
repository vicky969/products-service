---
name: nestjs-feature
description: Implement a scoped NestJS and Sequelize feature in products-service using its existing module, validation, error-handling, and real-MySQL test patterns. Use for approved API features, not broad refactors or architecture redesign.
---

# NestJS feature workflow

Use this skill for one approved feature task. Read `AGENTS.md`, the relevant FR/AC/NFR sections in `docs/01-spec.md`, architecture decisions in `docs/02-plan.md`, task order in `docs/03-tasks.md`, and related `DECISIONS.md` entries before changing code. The specification is the source of truth; stop and ask if it conflicts with code or is ambiguous.

## Fit the existing architecture

- Register a feature in a Nest module. Use `SequelizeModule.forFeature([Model])`, declare its controller, and provide its service; import the module from `AppModule` only when the feature is application-facing.
- Keep controllers limited to route decorators, DTO binding, query/parameter pipes, and declared HTTP status codes. Put business rules, not-found/conflict mapping, and orchestration in services.
- Keep persistence in `sequelize-typescript` models and service ORM calls. Use structured Sequelize options and fixed identifiers; never interpolate request data into raw SQL.
- Create DTOs for all incoming body/query data. Follow existing `class-validator` and `class-transformer` patterns so the shared global `ValidationPipe` rejects unknown fields, transforms query values, and validates at the HTTP boundary.
- Use Nest built-in HTTP exceptions with the specified client-actionable messages. Preserve the standard error shape and generic unexpected 500 behavior; never expose SQL or stacks.

## Implement narrowly

1. Identify affected FR, AC, NFR, and D IDs, files, API contracts, model/schema implications, and dependencies. State a 3-6 line plan before coding.
2. Write failing unit tests for service rules and DTO validation first. Add HTTP integration tests for externally observable behavior, status codes, response shapes, persistence, and MySQL-specific behavior where applicable.
3. Implement the smallest strict-TypeScript change that passes. Use explicit public return types; do not use `any`, `@ts-ignore`, disabled checks, speculative abstractions, or unrelated refactoring.
4. Add comments only for business rules or non-obvious decisions, explaining why rather than restating code. Record material alternatives/decisions in `docs/DECISIONS.md`.
5. Preserve existing routes, DTO fields, responses, statuses, decimal-string money handling, binary `productToken` uniqueness, and disabled Sequelize synchronization unless an approved requirement explicitly changes them.

## Test and finish

- Never delete, skip, weaken, or loosen a test to make it pass. Cover every new acceptance criterion and maintain AC-to-test traceability.
- Run `npm run build`, relevant unit tests, and regression tests. For HTTP integration tests, use real MySQL only with `E2E_DB_NAME=ecommerce_test`; never bypass the fail-closed guard or use SQLite.
- When executable code changes, run coverage and aim for at least 95% statements, branches, functions, and lines without lowering thresholds or excluding code to manufacture coverage. Report existing baseline limitations separately.
- Update the relevant spec, plan, tasks, README, and decisions when the approved change requires it. Review `git diff` and run `git diff --check` for scope creep, contract regressions, secrets, unsafe database handling, and unnecessary dependencies.
- Do not add dependencies without explaining the need and alternative and receiving approval. Do not commit, push, merge, or open a pull request without explicit approval.
