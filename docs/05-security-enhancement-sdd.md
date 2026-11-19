# Security Enhancement SDD

Status: **Proposed - implementation requires approval**  
Scope: HTTP hardening, request correlation, safe operational logging, and security regression coverage.  
Relationship to v1: This document supplements, but does not replace, `01-spec.md`, `02-plan.md`, `03-tasks.md`, `00-constitution.md`, or approved entries in `DECISIONS.md`.

## 1. Purpose and boundaries

The case-study API is a small HTTP/JSON products service. This enhancement strengthens its HTTP boundary and operational diagnostics while preserving every existing route, request shape, response body, status code, product rule, schema, and test-database safeguard.

This is not an authentication project. JWT authentication and authorisation are deliberately separate enhancements and are not designed, installed, or implemented by this SDD. The API **must not be exposed publicly** until an appropriate authentication and authorisation control has been separately specified, approved, implemented, and tested.

The existing v1 non-goals remain unchanged, including authentication, search/filtering, caching, soft delete, Swagger/OpenAPI, and new product fields or endpoints.

## 2. Current security assessment

### 2.1 SQL injection: reviewed, no current vulnerability identified

Production persistence uses Sequelize model operations only:

- create through `Product.create()`;
- lookup through `findByPk()`;
- listing through `findAndCountAll()` with validated numeric pagination and fixed `id ASC` ordering;
- stock persistence through an instance save restricted to `stock`;
- deletion through `destroy({ where: { id } })`.

There are no production `sequelize.query()` calls, no request-controlled SQL identifiers, and no interpolated SQL fragments. The raw SQL in the integration suite is test-only; its dynamic insert value uses named Sequelize replacements. Strict DTO validation and `ParseIntPipe` constrain request values before they reach the service.

No SQL-injection remediation code is planned. Future changes must retain structured ORM queries or use Sequelize bind/replacement parameters for reviewed raw SQL. In particular, request values must never control `ORDER BY`, column names, SQL fragments, or interpolated raw query text.

### 2.2 HTTP headers

The current bootstrap registers validation and exception handling but does not configure Helmet or an equivalent HTTP-header policy. Responses therefore lack an explicit, consistently tested security-header baseline.

### 2.3 Input handling and XSS boundary

The global `ValidationPipe` uses `whitelist`, `forbidNonWhitelisted`, and `transform`. `productToken` is trimmed and constrained to letters, digits, hyphens, and underscores. `name` is trimmed, required, and length-limited, but intentionally remains arbitrary plain text. Price, stock, page, limit, and IDs have their existing validation rules.

The service returns JSON and does not render HTML. Consequently, there is no current reflected or stored browser-executed XSS vulnerability in this API response handling. HTML sanitisation is not required and is not planned here: sanitising product names at the API boundary would mutate valid data and is not a context-independent XSS control.

Product names remain plain text. Any consuming UI must render them as text or apply correct contextual output encoding; it must not interpolate them into HTML with unsafe sinks such as `innerHTML`.

### 2.4 Exceptions and logging

Unexpected exceptions already produce the required generic 500 response, without SQL or stack details in the client response. The exception filter currently passes raw exception messages and stacks to the server logger. There is no request correlation ID and no structured, redacted request-completion logging.

This creates an operational gap: server logs can contain vendor/database details or user-derived values, and related events cannot be reliably traced across systems.

### 2.5 Authentication and authorisation

The API has no authentication or authorisation. Anyone who can reach it can create products, update stock, and delete products. This was an explicit v1 non-goal, not an accidental contract change.

Before public exposure, a separate security SDD must define the identity provider, token/key lifecycle, JWT verification, authorization policy, error contract, key rotation, tests, and operational ownership. This enhancement does not add partial JWT support, guards, roles, API keys, sessions, or user schema changes.

## 3. Security requirements

| ID | Requirement |
| --- | --- |
| SEC-1 | Preserve the current safe Sequelize posture: use structured ORM operations; do not add raw SQL with interpolated request data or request-controlled identifiers. |
| SEC-2 | Add a consistent HTTP security-header baseline to every API response without changing existing JSON bodies or HTTP status codes. |
| SEC-3 | Resolve a validated request correlation ID for every request, return it in `X-Request-ID`, and make it available to logging. |
| SEC-4 | Emit structured, allowlisted request and unexpected-error logs containing the correlation ID; exclude request/response bodies, query strings, cookies, credentials, authorisation values, raw SQL, and raw stacks. |
| SEC-5 | Preserve the existing generic unexpected-error response. SQL details and stack traces must never reach clients. |
| SEC-6 | Preserve strict DTO validation and JSON-only handling. Product names remain plain text; consuming UIs are responsible for safe rendering. |
| SEC-7 | Keep JWT authentication and authorisation out of this enhancement. Do not publicly expose the API until a separately approved authentication/authorisation control exists. |

## 4. Design constraints and decisions

- Existing functional requirements FR-1 through FR-6 and NFR-1 through NFR-6 remain authoritative.
- D-3 strict validation, D-9 shared `configureApp()`, D-10 real-MySQL integration tests, D-12 pinned dependencies, and D-14 generic 500 handling remain in force.
- No database schema, database privilege, model, endpoint, request-body, response-body, or status-code change is permitted.
- The existing fail-closed E2E guard must continue to reject every database name except exactly `ecommerce_test` before connecting or running schema work.
- New dependencies require approval before installation. Their versions must be pinned and then verified with the build and applicable tests.
- The shared application setup is the preferred integration point so production and HTTP integration tests exercise the same middleware.

## 5. Implementation plan

Each task is performed in order and as a separate implementation turn under `AGENTS.md`: short plan, failing tests first, smallest passing implementation, applicable verification, and documentation/decision updates.

### S1 - Helmet and HTTP security headers

**Expected files**

- `package.json` and `package-lock.json` after dependency approval;
- `src/app.setup.ts`;
- focused unit setup test and a focused HTTP security-header integration test;
- `README.md`, the source-of-truth SDD/task documents, and `DECISIONS.md` as applicable when implementation is approved.

**Dependencies**

Approval is required before installing pinned, Nest-11-compatible `helmet` and `@nestjs/helmet`. The alternative is manually setting individual Express headers, which avoids dependencies but is more error-prone and easier to let drift. Helmet is recommended.

**Approach**

Configure Helmet in shared application setup. Apply `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, a restrictive `Permissions-Policy`, and removal of `X-Powered-By`. Use a restrictive policy appropriate to JSON-only responses; verify it does not prevent a future, separately scoped documentation UI.

HSTS is enabled only after the deployment confirms end-to-end HTTPS and correct reverse-proxy trust configuration. It must not be applied indiscriminately to local HTTP development.

**Tests and acceptance criteria**

- Unit test confirms the shared setup configures the selected security middleware.
- HTTP integration tests assert approved headers on 2xx, validation 400, 404, and generic 500 responses.
- Tests assert `X-Powered-By` is absent.
- Existing status codes and JSON response bodies remain byte-for-byte compatible in their defined fields.
- The build, unit suite, and real-MySQL integration suite pass.

**Risks and rollback**

CSP-like or cross-origin policies can affect future browser consumers; HSTS can make browsers require HTTPS after receipt. Verify headers in the target deployment before enabling HSTS. Roll back by adjusting or removing the affected policy configuration; no data or schema rollback is involved.

### S2 - Request correlation IDs

**Expected files**

- new focused request-context middleware or equivalent component;
- `src/app.module.ts` and/or shared setup registration point;
- focused unit tests and HTTP integration tests;
- implementation documentation and decision/task records when approved.

**Dependencies**

None. Use Node's built-in cryptographic UUID generation.

**Approach**

Read `X-Request-ID`, accepting only a documented safe character set and bounded length. Preserve a valid supplied value; otherwise generate a UUID. Store the resolved value in request/response-local context and return it as the `X-Request-ID` response header. It is tracing metadata only and must never influence database access, routing, identity, or authorisation.

**Tests and acceptance criteria**

- Unit tests cover valid, missing, malformed, and oversized incoming values plus generated-ID format.
- HTTP integration tests confirm the header on success, validation failure, not found, and generic 500 paths.
- A valid client-supplied value is returned unchanged; invalid or absent values are replaced.
- No JSON body gains an ID field and no existing route behavior changes.

**Risks and rollback**

Unvalidated caller-controlled IDs can inject misleading log content or consume log capacity. Character and length validation mitigate this. Rollback removes the middleware/header only; it has no persistence impact.

### S3 - Structured and redacted logging

**Expected files**

- `src/app-exception.filter.ts`;
- request-completion logging middleware/interceptor and, if useful, a focused logging/redaction helper;
- unit and HTTP integration tests;
- implementation documentation and decision/task records when approved.

**Dependencies**

None. Retain Nest's built-in `Logger`.

**Approach**

Replace raw unexpected-error message/stack logging with stable, structured, allowlisted records. Request-completion records contain only correlation ID, method, path without query string, status, duration, and a safe error category where needed. Unexpected-error records contain correlation ID and safe exception classification.

Do not log request or response bodies, query strings, cookies, `Authorization` values, other credentials, database passwords, raw SQL/bind values, raw exception messages, or raw stacks. Preserve the existing generic 500 client body exactly.

**Tests and acceptance criteria**

- Unit tests prove sensitive headers, nested credential-like fields, raw SQL-looking text, and raw stacks are absent from records.
- An integration test injects an unexpected database-style error and confirms the current generic 500 response, correlated structured log event, and absence of injected SQL-like details from the client response and application log.
- Normal request logs contain no body or query string.
- Every request/error record includes the resolved request ID.

**Risks and rollback**

Safer logs provide less immediate diagnostic detail. The trade-off favors confidentiality; stable error classification and correlation preserve operational triage. Reverting to raw error logging is not recommended because it reintroduces log exposure; any such rollback requires explicit approval.

### S4 - Security regression tests and documentation

**Expected files**

- focused security unit/integration tests not already added by S1-S3;
- `README.md` and the source-of-truth docs/decision log when implementation is approved;
- this SDD, updated only to record approved implementation outcomes if requested.

**Dependencies**

None.

**Approach**

Complete traceable SEC-1 through SEC-7 test coverage and document deployed behavior, safe ORM rules, header policy, request-ID contract, redaction policy, XSS boundary, and the authentication/public-exposure warning. Keep test execution constrained to `ecommerce_test` for all HTTP integration tests.

**Tests and acceptance criteria**

- Regression coverage confirms all product API response bodies, status codes, and validation behavior remain intact.
- Security-header, request-ID, and log-redaction checks cover representative success and error paths.
- A static review guard or review test confirms no new production `sequelize.query()` or interpolated raw SQL is introduced without a reviewed exception.
- `npm run build`, unit tests, and the guarded real-MySQL E2E suite pass.
- Documentation explains that product names are plain text and consuming UIs must render them safely.
- Documentation states authentication is separate and public exposure is prohibited until an appropriate auth/authz solution is in place.

**Risks and rollback**

Documentation can drift from behavior, so the SEC-ID tests are the executable source of verification. Integration tests retain Docker/MySQL availability risk but must not weaken the `ecommerce_test` guard. Roll back each completed security task together with its tests and documentation; do not alter database data or schema.

## 6. Cross-task test scenarios

| Scenario | Requirement coverage |
| --- | --- |
| Product create/list/get/update/delete regression, including existing validation and error shapes | Contract preservation; SEC-2, SEC-5, SEC-6 |
| Security headers on 2xx, 400, 404, and 500 responses | SEC-2 |
| Valid supplied request ID, absent ID, malformed ID, oversized ID, generated ID | SEC-3 |
| Correlation ID appears in safe request and unexpected-error records | SEC-3, SEC-4 |
| Forced SQL-like unexpected error does not reach the client or application log as raw text | SEC-4, SEC-5 |
| HTML-like product name returns as JSON unchanged; consumer-rendering guidance is documented | SEC-6 |
| Source review confirms production Sequelize use remains structured and no unsafe raw SQL is introduced | SEC-1 |
| JWT/authentication is absent from implementation and public-exposure restriction is documented | SEC-7 |

## 7. Out of scope

- JWTs, API keys, sessions, user accounts, roles, permissions, tenant isolation, token rotation, and identity-provider integration;
- database schema or privilege changes;
- endpoint, status-code, request-body, response-body, or product-contract changes;
- HTML rendering, rich-text fields, or API-side HTML sanitisation;
- CORS redesign, rate limiting, WAF configuration, CSRF controls, or dependency upgrades unrelated to the approved Helmet addition;
- changes to the case-study implementation on `master`.

## 8. Completion criteria

The enhancement is complete only when S1 through S4 have been individually approved and implemented in order, every SEC requirement has automated evidence, the original product requirements still pass, all required dependency/version verification has occurred, and documentation accurately states the public-exposure/authentication boundary.
