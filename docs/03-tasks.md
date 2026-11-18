# Tasks

Work in order, one task per AI turn, following the protocol in `AGENTS.md`: **short plan, tests first, minimal implementation, run everything, explain back, update docs.**

**Explain-back questions** are for you. The AI lists them at the end of each task and keeps going; answer them in your own words before the interview. If you can't, ask the AI to explain until you can. Add what you learn to `DECISIONS.md`.

Refs: FR/NFR/AC from `01-spec.md`; D-n from `02-plan.md`.

---

## Task 0: Scaffold and toolchain
**Refs:** constitution, D-12, NFR-3
**Do:** npm project; pinned compatible Nest packages, `sequelize`, `sequelize-typescript`, `mysql2`, `class-validator`, `class-transformer`, `@nestjs/config`; dev: Jest, ts-jest, supertest, TypeScript; `tsconfig` (strict, decorators), `nest-cli.json`, Jest with separate unit and MySQL HTTP integration projects, `.gitignore`, `.env.example`, and fail-closed integration-test database configuration restricted to `ecommerce_test`.
**Test safety:** test setup must reject every database name except exactly `ecommerce_test` before connecting or running schema setup. It must reject `ecommerce` and any other configured name.
**Done when:** `npm run build` passes, a trivial unit test runs without MySQL, the integration harness starts against MySQL when available, and its safety check rejects any database name other than `ecommerce_test` before a database operation.
**Explain back:**
1. Why pin versions rather than take the latest? What broke before?
2. Why separate Jest projects for unit and integration?
3. What does `strict: true` catch?

## Task 1: Database, Docker and model
**Refs:** spec section 3, D-4, D-5, D-8, D-11, NFR-3
**Do:** SQL schema defined once and applied to `ecommerce` and `ecommerce_test` (`productToken` with `utf8mb4_bin`); `docker-compose.yml` with MySQL only; `Product` model (`timestamps: false`, attribute and creation-attribute types; `price` typed as a string); `AppModule` with `SequelizeModule.forRootAsync` reading env vars; `synchronize` off.
**Tests first:** integration check that the app connects to `ecommerce_test`, the table exists, and `sku-1` and `SKU-1` can both be inserted while an exact duplicate fails. Every integration setup path must reject a database name other than `ecommerce_test` before connecting or applying schema.
**Done when:** Docker MySQL starts, the connection test passes. **Confirm Docker works on your machine today.** This is the main schedule risk.
**Explain back:**
1. Why a binary collation on `productToken`? What happens without it?
2. Why is the schema in SQL and `sync` off?
3. Why is `price` a string in the model, and what does MySQL return for DECIMAL?
4. What are the attributes and creation-attributes types for?

## Task 2: Validation foundation
**Refs:** FR-6, D-3, D-9, NFR-1
**Do:** `configureApp()` with the global `ValidationPipe`; `CreateProductDto`, `UpdateStockDto`, `PaginationQueryDto` with all FR-6 rules (including trim then reject empty).
**Tests first:** DTO unit tests via `plainToInstance` and `validate`: one passing case and one failing case per rule.
**Done when:** every row of the FR-6 table is covered.
**Explain back:**
1. What do `whitelist`, `forbidNonWhitelisted` and `transform` each do?
2. Why must `transform` be on for query params?
3. Why does the API accept and return price as a decimal string instead of a JSON number?

## Task 3: Create product
**Refs:** FR-1 (AC-1.1 to 1.6), D-2, D-4, NFR-2
**Do:** `ProductsService.create`, `ProductsController.create`, `ProductsModule`; map `UniqueConstraintError` to `ConflictException`.
**Tests first:** service unit (success, conflict mapped, other errors rethrown); integration (201 with string price, 409, case-sensitive tokens, 400 listing all errors, unknown property, missing stock).
**Explain back:**
1. Why not SELECT before INSERT?
2. Why rethrow unexpected errors?
3. Which status codes does this endpoint return, and when?

## Task 4: Get product
**Refs:** FR-3
**Do:** `findOne` with `NotFoundException`; `ParseIntPipe` on the route.
**Tests first:** service (found, not found); integration (200, 404 message, 400 for `abc`).
**Explain back:**
1. What does `ParseIntPipe` do on `/products/abc`, and who produces the 400?
2. Why throw an exception instead of returning `null`?

## Task 5: List products with pagination
**Refs:** FR-2, D-7
**Do:** `findAll` with `findAndCountAll`, offset `(page-1)*limit`, `ORDER BY id`, meta with `totalPages`.
**Tests first:** service (arguments, meta maths, empty); integration (defaults, page 3, beyond last page, invalid params).
**Explain back:**
1. Why is a stable order essential for pagination?
2. What are the downsides of offset pagination, and what is the alternative?
3. Why cap `limit` at 100?

## Task 6: Update stock
**Refs:** FR-4, D-6
**Do:** `updateStock` (find, then update only `stock`); `PATCH :id/stock`.
**Tests first:** service (updates only stock, 404); integration (200, zero allowed, 400 for negative/float/missing, 400 for extra property, 404).
**Explain back:**
1. Why `PATCH /:id/stock` and not `PUT /:id`?
2. What goes wrong if two orders update stock at once, and what SQL fixes it?
3. Why does `forbidNonWhitelisted` matter here?

## Task 7: Delete product
**Refs:** FR-5
**Do:** `remove` using the `destroy` row count; `204` via `@HttpCode`.
**Tests first:** service (1 row resolves, 0 rows is 404); integration (204 then 404, unknown 404, token reusable after delete).
**Explain back:**
1. Why use the row count rather than `findByPk` first?
2. Why 204 and not 200 with a body?
3. How would soft delete change the unique constraint?

## Task 8: Review pass (keep it short)
**Refs:** NFR-1, NFR-2, quality bar
**Do:** ask the AI to audit the code against the spec: every AC mapped to a test (table in `DECISIONS.md`), consistent error shape, no `any`, nothing leaked. Run coverage once.
**Explain back:**
1. Which requirement has the weakest test coverage?
2. What does the client see, and what is logged, on an unexpected DB error?

## Task 9: README
**Refs:** NFR-5, NFR-6
**Do:** README with setup (`docker compose up`, env, run, test commands), endpoint table, **real** captured requests and responses (run the app, don't invent them), design decisions, limitations and next steps.
**Done when:** each curl example behaves exactly as written.
**Explain back:**
1. Which README claims did you verify by running them?
2. What are the honest limits, stated before the interviewer finds them?

Swagger/OpenAPI is outside v1 scope (D-13).

## Task 10: Interview rehearsal
**Do:** without the AI, walk through the repo aloud: spec, decisions, one request end to end (pipe, controller, service, model, MySQL), and the tests. Then do at least three drills from `04-change-drills.md`.
