---
name: security-review
description: Perform an evidence-based security review of products-service APIs, NestJS configuration, Sequelize access, dependencies, and tests. Use for review or hardening planning, not to silently implement security changes.
---

# Security review workflow

Read `AGENTS.md`, relevant FR/AC/NFR requirements, decisions, existing SDDs, source, configuration, dependencies, and tests. State the review scope and distinguish observed facts from recommendations. Do not change code unless the user separately authorises an implementation task.

When reviewing uncommitted changes, inspect staged changes, unstaged changes, and relevant untracked files. Keep the review read-only: report findings with severity and file references, and do not modify any files.

## Review checklist

- Input and API boundary: inspect DTOs, global `ValidationPipe`, unknown-property rejection, route parsing, mass-assignment risks, response serialization, and XSS boundaries. Product names are plain text; an API that returns JSON does not replace safe contextual rendering by consuming UIs.
- Database: inspect all Sequelize operations and raw queries for interpolation, request-controlled identifiers, unsafe ordering/filtering, parameter binding, constraints, transaction needs, concurrency, and error mapping.
- HTTP: inspect Helmet/equivalent security headers only if configured; report their actual behavior and configuration. Check CORS, HSTS, proxy assumptions, and rate-limit/auth controls only when present or explicitly in scope.
- Errors and logs: verify clients do not receive SQL, stacks, secrets, or internal details. Review logger inputs and redaction. Assess request correlation IDs only if implemented; do not claim they exist based on a plan.
- Secrets and dependencies: inspect tracked configuration, environment examples, package versions/lockfile, and audit results when available. Do not install, upgrade, or run destructive audit fixes during review without approval.
- Identity: authentication and authorisation are outside v1 unless separately approved. Never claim this API is safe for public exposure without appropriate authentication and authorisation.

## Findings and verification

- Classify findings by impact and likelihood, identify affected files/lines, attack preconditions, evidence, and a proportionate recommendation. State when no vulnerability is identified in a reviewed area without treating that as proof of complete safety.
- Preserve contracts and avoid speculative hardening. Proposed changes need requirements, tests, dependency approval where applicable, and an implementation plan before code.
- Add or recommend security regression tests for verified behavior. When code is authorised and changed, target at least 95% statements, branches, functions, and lines without weakening tests; report baseline limitations separately.
- Report commands run, results, scope limits, and unverified deployment assumptions. Do not expose secrets, stage, commit, push, merge, or open a pull request.
