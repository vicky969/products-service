# Plan

How the spec will be built, and why. Alternatives are listed because interviewers probe them.

## Architecture

```
HTTP request
   |
   v
ValidationPipe (global)  -- DTOs: CreateProductDto, UpdateStockDto, PaginationQueryDto
   |
   v
ProductsController       -- routes, status codes, ParseIntPipe
   |
   v
ProductsService          -- rules, error mapping (409/404)
   |
   v
Product model (sequelize-typescript)  -->  MySQL `ecommerce.products`
```

```
src/
  main.ts                    bootstrap
  app.module.ts              ConfigModule + SequelizeModule.forRootAsync + ProductsModule
  app.setup.ts               configureApp(app): global pipes, shared by main and tests
  products/
    product.model.ts
    products.module.ts
    products.controller.ts
    products.service.ts
    dto/
test/
  products.e2e-spec.ts       HTTP tests against real MySQL (ecommerce_test)
db/
  init files                 schema defined once, applied to ecommerce and ecommerce_test
docker-compose.yml           MySQL only
.env.example
AGENTS.md                    AI rules (Codex reads this); CLAUDE.md points to it
```

## Decisions

### D-1 HTTP REST, not a message transport
- **Why:** the brief says endpoints, request body and http codes. A transport adds infrastructure nobody asked for.
- **Rejected:** `@nestjs/microservices` (TCP/queue). **Revisit if** they say other services consume it over a queue.

### D-2 Database unique index is the uniqueness guard; service maps the error to 409
- **Why:** "find then insert" is racy. The index is the only reliable guard (NFR-2).
- **Rejected:** pre-check with `findOne` (race, extra query).

### D-3 Strict `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`); trim then reject empty
- **Why:** rejecting unknown fields blocks mass-assignment (clients can't set `id`) and exposes typos. `transform` turns query strings into numbers. Trimming first means `"   "` is rejected as empty.
- **Rejected:** `whitelist` only (silently drops fields); hand-written checks in the service.

### D-4 Money uses decimal strings at the API boundary and `DECIMAL(10,2)` in MySQL
- **Choice:** accept a decimal string such as `"19.99"`, validate its syntax and the 0 to 99,999,999.99 range, persist it as MySQL `DECIMAL(10,2)`, and return it as a decimal string with two fractional digits.
- **Why:** decimal strings preserve the exact value through validation and serialization; MySQL `DECIMAL` is fixed-point. Never convert monetary values to JavaScript `Number` for API handling or monetary calculations.
- **Rejected:** JSON numeric prices and `FLOAT`/`DOUBLE`, which risk precision loss.

### D-5 Token uniqueness is case-sensitive, enforced by a binary collation
- **Why:** the decision is exact-match tokens. MySQL's default collations are case-insensitive, so `sku-1` would collide with `SKU-1` even without our intent. Using `utf8mb4_bin` on `productToken` makes the database match the spec.
- **Trap to remember:** collation decides uniqueness, not application code.
- **Rejected:** default collation (silently case-insensitive); upper-casing tokens in the DTO (changes the data the client sent).

### D-6 Stock update sets an absolute value, on `PATCH /products/:id/stock`
- **Why:** the brief says update the stock quantity. A narrow endpoint cannot change other fields.
- **Known limitation:** read-then-write is last-write-wins under concurrency. Real order flow needs an atomic `stock = stock - :n WHERE stock >= :n`.
- **Rejected for v1:** `PUT /products/:id` (broader than asked); delta endpoint; optimistic locking.

### D-7 Pagination: offset, `ORDER BY id`, limit capped at 100
- **Why:** simple, deterministic, bounded.
- **Rejected:** keyset pagination (better at scale, more complex); unbounded limit.

### D-8 Schema in a SQL script; Sequelize `sync` disabled
- **Why:** one explicit contract for the schema, which can't alter columns behind your back. Applied to both `ecommerce` and `ecommerce_test`.
- **Rejected:** `sync({ alter: true })`; a migration tool (right for production, overkill here, listed as a next step).

### D-9 `configureApp()` shared by `main.ts` and tests
- **Why:** tests must exercise exactly the pipes production uses.

### D-10 Test strategy
- **Unit (no database):** service tests with a mocked model and DTO validation tests using `class-validator`. Controller unit tests are not required.
- **Integration (HTTP, real MySQL):** supertest against the Nest app connected to Docker Compose MySQL, using only the isolated `ecommerce_test` database. The test setup must reject any other database name before connecting or running schema setup.
- **Why real MySQL:** it exercises MySQL-specific behavior including binary collation, `UNSIGNED`, and `DECIMAL` persistence. Tables are isolated from the normal `ecommerce` database.
- **Trade-off:** integration tests require Docker and a running MySQL test database; document the setup in the README.


### D-11 Docker Compose runs MySQL only
- **Why:** it is the only dependency worth containerising for this scope. The NestJS app runs with `npm`.
- **Rejected:** containerising the app (extra Dockerfile to explain, not requested).

### D-12 Versions are pinned but not constitutional
- **Why:** pinned dependencies make the toolchain reproducible. Version compatibility anecdotes in `DECISIONS.md` are historical observations requiring independent verification for this workspace. Verify with a build and tests after installation. The constitution names the stack, not version numbers.

### D-13 Swagger/OpenAPI is outside v1
- **Why:** README endpoint documentation and request/response examples satisfy the v1 documentation scope without adding a separate API documentation layer.


### D-14 Logging and 500s
- **Why:** Nest's built-in `Logger`. Unexpected errors return a generic 500 and are logged with detail on the server only, so no database details leak.

## Risks

| Risk | Mitigation |
| --- | --- |
| Integration tests depend on Docker | document; confirm Docker works on Day 1 (Task 1) |
| Case-sensitivity depends on collation, not code | integration test with `sku-1` / `SKU-1` (AC-1.3) |
| AI adds unrequested features | rules in `AGENTS.md`; non-goals in spec |
| Human can't explain code they didn't write | explain-back questions per task |
| Dependency resolution breaks the toolchain | D-12 |
