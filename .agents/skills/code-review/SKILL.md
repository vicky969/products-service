---
name: code-review
description: Independently review products-service changes against approved requirements, architecture, API contracts, database safety, tests, and documentation. Use for review-only requests; do not modify code automatically.
---

# Code review workflow

Read `AGENTS.md`, the relevant FR/AC/NFR requirements, approved SDDs/decisions, changed files, and surrounding implementation/tests. Review independently from the author’s rationale. This is read-only unless the user explicitly asks for fixes after receiving findings.

When reviewing uncommitted changes, inspect staged changes, unstaged changes, and relevant untracked files. Keep the review read-only: report findings with severity and file references, and do not modify any files.

## Review dimensions

- Correctness: map every changed behavior to its requirement and acceptance criteria; inspect success, validation, boundary, missing-resource, error, and concurrency cases.
- Architecture: verify controllers remain HTTP-focused, services own rules/error mapping, DTOs validate boundary input, and models/services use the existing Sequelize conventions.
- Contracts: check routes, methods, statuses, messages, response shapes, decimal strings, and compatibility with existing clients.
- Security and data: inspect validation/mass assignment, secrets, exception leakage, logging, ORM/raw SQL safety, constraints, transactions, test-database safety, and destructive operations.
- Tests and quality: assess whether tests fail without the change, cover ACs and regressions, use real MySQL when MySQL behavior matters, and preserve the `ecommerce_test` guard. Review the target of at least 95% statements, branches, functions, and lines without accepting weakened tests or thresholds.
- Maintainability: identify unnecessary dependencies, abstractions, refactors, performance risks, comments that obscure rather than explain, and documentation/decision drift.

## Report findings first

- Categorise each finding as Critical, High, Medium, or Low. Include exact file path and line number where possible, a concise impact/explanation, and the requirement or convention it conflicts with.
- List findings before suggested fixes. Do not automatically edit code, tests, dependencies, docs, or Git state.
- Separate verified findings from questions, assumptions, and non-blocking improvements. If no findings remain, say what was reviewed and what was not run or could not be verified.
- Do not claim a passing build/test or safe deployment without actual evidence. Do not expose secrets, commit, push, merge, or open a pull request.
