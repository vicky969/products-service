---
name: sdd-workflow
description: Implement a scoped products-service requirement from its SDD using acceptance-criteria-first tests, minimal NestJS changes, and documented verification. Use for planned feature, bug-fix, or approved security work; not for exploratory reviews.
---

# SDD workflow

Use this skill for one approved task at a time. Preserve the case-study contract: the functional specification is the source of truth for behaviour.

## Discover before changing

1. Read `AGENTS.md`, then the relevant sections of `docs/01-spec.md`, `docs/02-plan.md`, `docs/03-tasks.md`, `docs/00-constitution.md`, and `docs/DECISIONS.md`. Read any task-specific SDD before acting.
2. Identify the applicable FR, AC, NFR, and D IDs. Map each acceptance criterion to a planned test.
3. Inspect the current implementation, existing tests, package manifest, and affected architecture layer. Identify exact files, existing patterns, and whether a dependency is truly necessary.
4. Check the available skills and apply only ones relevant to the task. Follow their instructions before taking their actions.
5. If requirements conflict, are ambiguous, or would require an unapproved dependency, stack change, schema/API-contract change, or destructive action, stop and ask. Do not invent behaviour.

## Plan and implement

1. State a concise 3-6 line plan: files, requirement IDs, tests, and verification. Work on one task only.
2. Write or update failing tests first. Cover every applicable AC; never delete, skip, weaken, or loosen an existing test to obtain a pass.
3. Make the smallest change that passes the tests. Keep controllers HTTP-only, services responsible for rules/error mapping, models responsible for persistence, and DTOs responsible for edge validation.
4. Follow existing strict TypeScript and NestJS patterns. Do not introduce `any`, `@ts-ignore`, disabled checks, secrets, unrelated refactors, endpoints, fields, options, or dependencies.
5. Comment only business rules or non-obvious decisions. Explain why, not what; record a material design choice in `docs/DECISIONS.md`.

## Verify and document

1. Run the relevant unit tests, `npm run build`, and applicable regression checks. For HTTP integration tests, use real MySQL only and set `E2E_DB_NAME=ecommerce_test`; never bypass the fail-closed test-database guard or substitute SQLite.
2. Run coverage when the task changes executable code. Aim for at least 95% statements, branches, functions, and lines without lowering thresholds or excluding code to manufacture a result. Report any pre-existing coverage limitation separately from the task result.
3. Update the relevant specification/plan/task documentation, README, and decisions only when the approved change requires it. Preserve prior requirements and decisions unless an approved change explicitly revises them.
4. Review the final diff for scope creep, API-contract changes, security leaks, regressions, unnecessary dependencies, and unrelated edits. Run `git diff --check`.
5. Report actual commands and results, changed files, requirement/test coverage, remaining risks, and anything not run. Do not claim verification that did not occur. Do not stage, commit, push, merge, or open a pull request without explicit approval.

## Repository invariants

- Preserve defined routes, status codes, error shapes, decimal-string money handling, and case-sensitive `productToken` uniqueness unless an approved specification change says otherwise.
- Keep Sequelize synchronization disabled; the SQL schema remains the schema source.
- Reject unknown DTO properties and preserve validation at the HTTP edge.
- Never expose SQL details, stacks, passwords, or other sensitive information in responses, logs, tracked files, or documentation.
