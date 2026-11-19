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

## 2026-11-19  Task 1 database, model and integration checks

- Decision: keep `db/init.sql` as the sole schema definition and create `ecommerce_test.products` with `CREATE TABLE ... LIKE ecommerce.products`; grant the app user access to the isolated test database. Compose runs MySQL only and uses environment-provided passwords.
- Decision: define `ProductAttributes` and `ProductCreationAttributes` explicitly; `price` is a string so Sequelize's DECIMAL value is not represented as a JavaScript number. The model has `timestamps: false`, and app configuration has `synchronize: false`.
- Safety test adjustment: the unit test now exercises the same pure database-name predicate used by the runner. The prior subprocess-based test could not spawn Node under this environment (`EPERM`), causing a null subprocess status; the runner still validates the database name before starting Jest, and the Jest setup pins `DB_NAME` before loading the app.
- Verification: build and both unit test commands passed. The MySQL integration suite started but all four checks failed before executing because MySQL rejected the app connection from host `172.21.0.1` (`Host ... is not allowed to connect`). Docker CLI reports the engine pipe is unavailable to this session. No Docker volume was removed or modified.

## 2026-11-19  Task 1 connection diagnosis follow-up

- Docker status: `products-service-sdd-mysql-1` is running and reports `healthy`, with `127.0.0.1:3306` published. The Docker engine was reachable after requesting elevated access.
- Configuration finding: there is no local `.env`; `DB_PASSWORD` and `MYSQL_ROOT_PASSWORD` are unset in the workspace environment. `.env.example` is only a template. Compose cannot resolve its required password variables, while the app falls back to its configured host/user/database defaults and an empty password.
- Database access finding: the app connection is rejected by MySQL with `Host '172.21.0.1' is not allowed to connect`. Attempts to authenticate as `products_app` using the container's configured app-password variable and as `root` using its configured root-password variable were denied. Therefore the account's existence and grants on the existing data volume could not be verified. The init SQL only runs when MySQL initializes an empty data directory, so editing it does not alter the existing volume.
- Change: added an explicit `ecommerce.*` grant alongside the existing `ecommerce_test.*` grant in `db/init.sql` for future initialization, and added an E2E assertion that the Sequelize module option `synchronize` is `false`. No running container, database or volume was changed.
- Verification: `npm run build` passed; `npm test` passed (2 suites, 2 tests); `npm run test:e2e` with `E2E_DB_NAME=ecommerce_test` failed (1 suite, 5 tests) before assertions because of the MySQL host rejection; `git diff --check` passed. The MySQL schema, exact duplicate behavior, case-sensitive token behavior, DECIMAL string retrieval, and E2E synchronization assertion remain unverified against the live database.

## 2026-11-19  Task 1 fresh-volume credential verification

- Decision: generated two independent 256-bit random passwords and stored them only in the ignored local `.env`. No credential values were copied to tracked files, logs, or test output.
- Decision: kept the original container and `products-service-sdd_mysql_data` volume intact. Set the local Compose project to `products-service-sdd-fresh` and its host port to `3307`, creating a separate fresh volume rather than resetting or deleting existing data.
- Verification: rendered Compose configuration matched both `.env` passwords and the configured app user; the fresh container became healthy. Root authentication succeeded. Read-only metadata confirmed `products_app@%` exists with privileges on both `ecommerce` and `ecommerce_test`; the `.env` app credential connected to each database. Both databases have the `products` table.
- Verification: `npm run test:e2e` with `E2E_DB_NAME=ecommerce_test` passed (1 suite, 5 tests), covering test-database connection, timestamps disabled, synchronization disabled, schema columns/types, case-sensitive `sku-1`/`SKU-1` uniqueness and exact-duplicate rejection, and DECIMAL string persistence/retrieval.
- Status: the old container/volume remains running and untouched; the local app/Compose configuration now targets the separately initialized fresh project. Passwords were not changed after its initialization.

## 2026-11-19  Task 2 validation foundation

- Decision: `configureApp()` registers Nest's global `ValidationPipe` with `whitelist`, `forbidNonWhitelisted` and `transform`; `main.ts` uses this shared setup. DTOs trim only the product token and name, preserve price as a decimal string, and transform pagination query values to numbers.
- Test coverage: unit tests cover the FR-6 rules for create/update DTO values and pagination defaults and boundaries, plus the shared pipe's rejection of unknown properties and query-string transformation. The FR-6 `:id` integer validation coverage was deliberately deferred to Task 4, which assigns `ParseIntPipe` and the invalid `abc` route test; Task 4 now covers it. No API routes, controllers or service logic were added in Task 2.
- Verification: `npm run build` passed; `npm test` passed (3 suites, 40 tests); direct `npm run test:e2e` without `E2E_DB_NAME` was refused by the fail-closed guard; `npm run test:e2e` with `E2E_DB_NAME=ecommerce_test` passed (1 suite, 5 MySQL tests). The latter rechecked Task 1's live database assumptions after the application bootstrap change.

## 2026-11-19  Task 3 create product

- Decision: create attempts go directly to the database unique index; `UniqueConstraintError` maps to HTTP 409 with the FR-1 message, while unexpected persistence errors are rethrown for Nest's server-side error handling.
- Test coverage: service unit tests cover success, conflict mapping, and rethrowing other errors. MySQL HTTP integration tests cover AC-1.1 through AC-1.6 and NFR-2, including decimal-string responses, exact duplicate rejection, case-distinct tokens, simultaneous duplicate creates, aggregated validation failures, unknown properties, and missing stock.
- Verification: `npm run build` passed; `npm test` passed (4 suites, 43 tests); `npm run test:e2e` with `E2E_DB_NAME=ecommerce_test` passed (2 suites, 12 tests) against real MySQL; `git diff --check` passed.

## 2026-11-19  Task 4 get product

- Decision: `GET /products/:id` passes the route value through Nest's `ParseIntPipe`; the service looks up the parsed id and throws `NotFoundException` with the FR-3 message when no row exists.
- Test coverage: service unit tests cover found and not-found results. MySQL HTTP integration tests cover 200 for an existing product, the specified 404 message for an unknown id, and 400 for `/products/abc`, covering the deferred FR-6 `:id` integer rule.
- Verification: `npm run build` passed; `npm.cmd test` passed (4 suites, 45 tests); `npm.cmd run test:e2e` with `E2E_DB_NAME=ecommerce_test` passed against real MySQL (2 suites, 15 tests); `git diff --check` passed. One parallel unit-test invocation could not resolve the installed `uid` package, and the PowerShell `npm test` wrapper once exited with `Could not determine Node.js install directory`; `npm ls uid` confirmed `uid@2.0.2` is present, and the standalone `npm.cmd test` run passed.

## 2026-11-19  Task 5 product listing with pagination

- Decision: `ProductsService.findAll` uses `findAndCountAll` with offset `(page - 1) * limit` and ascending `id` order. It returns the current page plus total, page, limit, and ceiling-based total page count; an empty result has zero total pages.
- Test coverage: service unit tests verify query options, page metadata, and the empty result. MySQL HTTP tests cover default pagination, page 3 ordering, a page beyond the last page, and invalid page/limit values (FR-2 AC-2.1 through AC-2.6).
- Verification: `npm.cmd run build` passed; `npm.cmd test` passed (3 suites, 46 tests); `npm.cmd run test:e2e` with `E2E_DB_NAME=ecommerce_test` passed against real MySQL (2 suites, 25 tests).

## 2026-11-19  Task 6 stock update

- Decision: stock updates are absolute values. The service finds the product, changes only `stock`, and saves with `fields: ['stock']`. This preserves the other columns; as D-6 records, concurrent read-then-write updates remain last-write-wins, and an order flow would need an atomic conditional decrement.
- Test coverage: service unit tests verify the persisted field list and 404 behavior. MySQL HTTP tests cover successful updates with other fields unchanged, zero stock, negative/fractional/missing values, extra properties, and unknown ids (FR-4 AC-4.1 through AC-4.5).
- Verification: `npm.cmd run build` passed; `npm.cmd test` with `NODE_OPTIONS=--max-old-space-size=1024` passed (3 suites, 48 tests); `npm.cmd run test:e2e` with `E2E_DB_NAME=ecommerce_test` and the same Node heap setting passed against real MySQL (3 suites, 32 tests). Sandboxed Jest runs initially hit Node out-of-memory during compilation; the guarded E2E run passed outside the sandbox. `git diff --check` passed.

## 2026-11-19  Task 7 delete product

- Decision: `ProductsService.remove` performs a hard delete and uses the affected-row count to distinguish success from an unknown id; it does not issue a separate lookup. The controller returns 204 with no response body.
- Test coverage: service tests verify one deleted row resolves and zero rows returns 404. MySQL HTTP tests verify 204 followed by 404, 404 for an unknown id, and successful reuse of a deleted product token (FR-5 AC-5.1 through AC-5.3).
- Verification: `npm.cmd run build` passed; `npm.cmd test` with `NODE_OPTIONS=--max-old-space-size=1024` passed (3 suites, 50 tests); `npm.cmd run test:e2e` with `E2E_DB_NAME=ecommerce_test` and the same Node heap setting passed against real MySQL (4 suites, 35 tests). The sandbox denied the MySQL E2E connection with EACCES on port 3307, so the guarded E2E run was repeated outside the sandbox and passed.
