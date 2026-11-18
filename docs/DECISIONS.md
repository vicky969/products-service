# Decisions log

Append-only. One entry whenever something is decided, changed, or goes wrong. This is your interview script.

Format:

```
## YYYY-MM-DD  <short title>
- Context / Decision / Alternatives / Why / Spec or plan changes
```

---

## 2026-11-17  Start: first draft of the spec and plan
- Context: spec and plan drafted with AI from the Scalapay brief.
- Decision: initial decisions D-1 to D-11, with defaults for four open questions.

## 2026-11-18  Reviewed 19 decisions with a second AI assistant and approved them
- Context: asked another AI assistant to review the draft and recommend decisions, then approved all 19 myself so I could stop refining documents and start building.
- Decisions: field types, timestamps omitted, stock-only update, case-sensitive token uniqueness, token reuse after hard delete, stock required with no default; pagination and error contract; trim and reject empty; token character set; price returned as a string; SQL schema as the single source with `sync` off; Docker Compose MySQL for tests; unit plus HTTP integration tests against real MySQL; Swagger deferred; Compose runs MySQL only; built-in logger with generic 500s; pinned but non-constitutional versions; no mandatory approval pause after each task; `AGENTS.md` for Codex with tool-neutral README.
- Changes made while applying them (explain these):
  - Case-sensitive uniqueness needs a **binary collation** (`utf8mb4_bin`) on `productToken`, because MySQL's default collations are case-insensitive. Added to spec section 3 and plan D-5.
  - Real-MySQL integration tests mean tests need Docker running. Noted as a risk, with Task 1 confirming Docker on day one.
  - Error body is Nest's standard shape (`statusCode`, `message`, plus an `error` label) rather than a hand-rolled `{ statusCode, message }`, to avoid writing a custom exception filter.
  - Approval pauses removed after each task, but the AI still stops for hard-rule situations (new dependency, ambiguous spec, stack change). Explain-back questions stay, non-blocking.
  - Drill 7 reversed to match the new collation decision.
- Alternatives: see the plan.
- Spec/plan changes: `01-spec.md` v2, `02-plan.md` (D-1 to D-14), constitution, tasks, `AGENTS.md`, drills.

## 2026-11-18  Approved consistency corrections
- Context: reviewed v2 against the approved Scalapay assignment and corrected cross-document inconsistencies without reopening the 19 approved design decisions.
- Decision: price input and output are decimal strings; validate decimal syntax and the `DECIMAL(10,2)` range, persist as MySQL `DECIMAL(10,2)`, and never convert monetary values to JavaScript `Number`.
- Decision: stock is MySQL `INT UNSIGNED` with no default. Its database range is 0-4,294,967,295; the API accepts 0-2,147,483,647.
- Decision: unit coverage consists of service tests with a mocked model and DTO validation tests. HTTP integration tests use real MySQL in Docker Compose and only `ecommerce_test`; setup fails before connecting or applying schema if another database name is selected. Controller unit tests are not required.
- Decision: Swagger/OpenAPI is outside v1 scope. Change drills are optional interview practice and outside v1 implementation scope.
- Decision: README documentation and examples replace the obsolete comparison instruction referencing a separate reference build.
- Spec/plan/task changes: updated `01-spec.md`, `02-plan.md`, `03-tasks.md`, `AGENTS.md`, `README.md`, and `04-change-drills.md` to match these decisions.

## Things that went wrong (fill in as you build)

Historical observations from a prior/reference build. These are not established compatibility facts; independently verify each against this workspace and its current dependency versions before relying on it:

- A prior build reportedly found a Nest major version incompatible with its Jest setup. Exact versions, error and cause require verification.
- A prior build reportedly found a TypeScript version incompatible with ts-jest. Exact versions, error and cause require verification.
- A prior build reportedly encountered Sequelize model typing friction with `Model<Product>`. The code and type definitions need verification before treating the reported cause or fix as established.

## AC-to-test traceability (fill in during Task 8)

| AC | Test file and name |
| --- | --- |
| AC-1.1 | |
| AC-1.2 | |
| ... | |
## 2026-11-18  Task 0 scaffold and verified toolchain

- Decision: pinned NestJS 11.2.11, Nest CLI 11.0.24, TypeScript 5.9.3, Sequelize 6.37.7, Jest 29.7.0, and the remaining direct dependencies at the exact versions in `package.json` and `package-lock.json`.
- Database safety: `scripts/run-e2e-tests.cjs` rejects any `E2E_DB_NAME` other than exactly `ecommerce_test` before spawning Jest. The negative unit test verified rejection for `ecommerce`.
- Verification: `npm run build` passed; `npm test` passed (2 suites, 2 tests); `npm run test:e2e` passed (1 suite, 1 test) with `E2E_DB_NAME=ecommerce_test`. The Task 0 integration harness is only a scaffold smoke test; MySQL was not connected or exercised because database wiring is Task 1.
- Audit: `npm audit` reported 48 vulnerabilities (3 moderate, 45 high). No audit fixes or version changes were applied.