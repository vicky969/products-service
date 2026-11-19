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

## AC-to-test traceability

| Requirement | Test file and test name |
| --- | --- |
| AC-1.1 | `test/e2e/products.e2e-spec.ts` — creates a product with its price returned as a decimal string |
| AC-1.2 | `test/e2e/products.e2e-spec.ts` — returns a conflict for an exact duplicate product token |
| AC-1.3 | `test/e2e/products.e2e-spec.ts` — treats product tokens as case-sensitive |
| AC-1.4 | `test/e2e/products.e2e-spec.ts` — reports all validation errors for an invalid request body |
| AC-1.5 | `test/e2e/products.e2e-spec.ts` — rejects unknown request properties |
| AC-1.6 | `test/e2e/products.e2e-spec.ts` — rejects a create request with missing stock; `test/unit/validation-foundation.spec.ts` — requires every create product field, including stock |
| AC-2.1 | `test/e2e/products.e2e-spec.ts` — uses the default page and limit when listing products |
| AC-2.2 | `test/e2e/products.e2e-spec.ts` — default and third-page listing tests assert `data` and all pagination metadata |
| AC-2.3 | `test/e2e/products.e2e-spec.ts` — default and third-page listing tests assert ascending ID order |
| AC-2.4 | `test/e2e/products.e2e-spec.ts` — returns an empty page beyond the last page with the correct total |
| AC-2.5 | `test/e2e/products.e2e-spec.ts` — rejects invalid page and limit values |
| AC-2.6 | `test/unit/products.service.spec.ts` — returns empty data and zero total pages when no products exist; `test/e2e/products.e2e-spec.ts` — returns empty data and zero pagination totals when there are no products |
| AC-3.1 | `test/e2e/products.e2e-spec.ts` — retrieves a product by its id |
| AC-3.2 | `test/e2e/products.e2e-spec.ts` — returns the not found message for an unknown product id |
| AC-3.3 | `test/e2e/products.e2e-spec.ts` — rejects a non-integer product id |
| AC-4.1 | `test/e2e/products-stock.e2e-spec.ts` — updates stock and leaves the other product fields unchanged |
| AC-4.2 | `test/e2e/products-stock.e2e-spec.ts` — allows stock to be set to zero |
| AC-4.3 | `test/e2e/products-stock.e2e-spec.ts` — rejects negative, non-integer, and missing stock values |
| AC-4.4 | `test/e2e/products-stock.e2e-spec.ts` — rejects properties other than stock in an update request |
| AC-4.5 | `test/e2e/products-stock.e2e-spec.ts` — returns not found when updating an unknown product id |
| AC-5.1 | `test/e2e/products-delete.e2e-spec.ts` — returns no content after deleting a product, and the product is then not found |
| AC-5.2 | `test/e2e/products-delete.e2e-spec.ts` — returns not found when deleting an unknown product id |
| AC-5.3 | `test/e2e/products-delete.e2e-spec.ts` — allows a deleted product token to be reused |
| FR-6 productToken | `test/unit/validation-foundation.spec.ts` — trims and accepts allowed characters; rejects non-string, empty after trimming, overlength, and invalid characters |
| FR-6 name | `test/unit/validation-foundation.spec.ts` — trims and accepts a valid name; rejects non-string, empty after trimming, and overlength values |
| FR-6 price | `test/unit/validation-foundation.spec.ts` — accepts decimal-string boundaries and rejects numbers, leading zeroes, excess precision, exponent notation, and out-of-range values |
| FR-6 stock | `test/unit/validation-foundation.spec.ts` — accepts valid integer boundaries and rejects negative, fractional, string, and over-limit values for stock updates; create endpoint tests cover invalid and missing stock |
| FR-6 page and limit | `test/unit/validation-foundation.spec.ts` — verifies defaults, query transformation, integer rules, and bounds |
| FR-6 :id | `test/e2e/products.e2e-spec.ts` — rejects a non-integer product id |
| NFR-1 validation and known errors | `test/e2e/products.e2e-spec.ts` and `test/e2e/products-stock.e2e-spec.ts` — exercise validation, conflict, and not-found response bodies |
| NFR-1 unexpected errors | `test/e2e/products.e2e-spec.ts` — returns a generic error body for unexpected failures without exposing database details; verifies the required 500 `error` label, excludes SQL details from the response, and confirms details reach the server logger. |
| NFR-2 | `test/e2e/products.e2e-spec.ts` — allows only one of two concurrent creates for a product token |
| NFR-3 and NFR-4 | `test/e2e/scaffold.e2e-spec.ts` — connects to `ecommerce_test`; `test/unit/database-safety.spec.ts` — accepts only `ecommerce_test`; `test/e2e/database-safety.setup.cjs` and `scripts/run-e2e-tests.cjs` enforce the database guard before tests connect |
| NFR-6 unexpected-error logging | `test/e2e/products.e2e-spec.ts` — confirms unexpected error details are passed to the server logger. |

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

## 2026-11-19  Task 8 implementation review

- Review: the implemented routes and FR-6 validation rules match the approved scope; MySQL integration coverage exercises product persistence, pagination, stock update and deletion. No production or test TypeScript `any` types, SQL/stack response construction, or credential exposure were found. `.env` is ignored and untracked; `.env.example` is the only tracked environment file.
- Finding: Nest's default handler for an unexpected exception returns the generic 500 message and logs the exception, so SQL details and stack traces are not sent in the response. Its response omits the `error` label required by NFR-1, and no HTTP test currently verifies unexpected-error response/log behavior. This remains outstanding for review; no exception filter or behavior change was introduced in this audit.
- Verification: `npm.cmd run build` passed. `npm.cmd test -- --coverage` passed (3 suites, 50 tests); reported 100% statements, branches, functions, and lines for files included in unit coverage. `npm.cmd run test:e2e` initially could not reach local MySQL inside the sandbox (`EACCES` to `127.0.0.1:3307`); the same guarded run with `E2E_DB_NAME=ecommerce_test` passed outside the sandbox (4 suites, 35 tests) against MySQL. `git diff --check` passed before this documentation update; it was rerun after the update.

## 2026-11-19  Task 8 review findings addressed

- Resolution: this follow-up closes the NFR-1 gap recorded in the earlier Task 8 review entry.
- Change: added `AppExceptionFilter` to the shared application setup. It preserves Nest `HttpException` responses; unexpected failures are logged with server-side details and return `statusCode`, a generic `message`, and the required `error` label. No exception detail is included in the response.
- Test coverage: the MySQL HTTP suite injects an unexpected error containing SQL-like details and verifies the 500 body, absence of those details from the response, and server logging. An empty-table HTTP test verifies `data: []` and `{ total: 0, page: 1, limit: 10, totalPages: 0 }`; the test runner's existing fail-closed guard restricts the suite to `ecommerce_test`.
- Verification: `npm.cmd run build` passed; `npm.cmd test` passed (3 suites, 50 tests); `npm.cmd run test:e2e` with `E2E_DB_NAME=ecommerce_test` passed against MySQL (4 suites, 37 tests). `git diff --check` was run after this documentation update.

## 2026-11-19  Security enhancement S1 HTTP headers

- Decision: use direct `helmet@8.3.0` middleware in shared `configureApp()` rather than add `@nestjs/helmet`. The application already uses Nest's Express adapter, so direct official middleware is sufficient and avoids an unnecessary wrapper dependency.
- Decision: apply a restrictive JSON-API CSP, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, and a restrictive `Permissions-Policy`; leave HSTS disabled for local HTTP development. Production HSTS requires a separately verified HTTPS/proxy deployment decision.
- Test coverage: guarded MySQL HTTP tests cover the headers and unchanged contracts for 200, validation 400, 404, and generic 500 responses. S2 correlation IDs, S3 structured/redacted logging, S4 consolidation, and JWT authentication remain out of scope for this task.
