# Optional change drills (outside v1 implementation scope)

These are interview-practice exercises only. Do not implement them as part of v1 unless the specification is explicitly changed and approved.

In the final interview they may say "can you change X to do Y?". Practise until the loop is automatic.

## The change loop (always the same)

1. **Clarify** the requirement out loud (ask 1-2 questions; this is what a senior engineer does).
2. **Spec:** which FR/AC changes or is added? Write the new acceptance criteria first.
3. **Plan:** does it change a decision (D-n)? What is the trade-off? Log it in `DECISIONS.md`.
4. **Tasks:** list the smallest steps, usually 2-4.
5. **Tests first:** write the failing test(s) from the new ACs.
6. **Code:** smallest change that passes. Re-run the whole suite (regressions!).
7. **Say what you did and what you did *not* do** (scope, known limits).

**Live in an interview with no time to write docs?** Say the spec change aloud ("the new rule is: ..."), write the test first, then the code. The habit is the point.

Where things live (so you can navigate fast):

| To change... | Look in |
| --- | --- |
| What a field accepts | `src/products/dto/*.ts` |
| A route, status code or path | `src/products/products.controller.ts` |
| A rule or error mapping | `src/products/products.service.ts` |
| A column or its type | `src/products/product.model.ts` **and** the SQL schema in `db/` |
| App-wide pipes | `src/app.setup.ts` |
| DB connection or env vars | `src/app.module.ts`, `.env.example` |

Tip: any column change touches the model, the SQL schema, the DTO, the tests and the docs. Say that list out loud; it shows you understand the blast radius.

---

## Drill 1: Allow updating price and name (target: 15 min)
**Request:** "Can sellers also change the price and name of a product?"
- **Clarify:** all fields or only those two? Can `productToken` change? (Suggest: no, it is an identifier.)
- **Spec:** new FR (for example FR-7 `PATCH /products/:id`, partial body `{ name?, price? }`, at least one required). Reuse FR-6 rules.
- **Decision to log:** keep `PATCH /:id/stock` as is, or fold it in? (Backwards compatibility says keep it.)
- **Code:** new `UpdateProductDto` using `PartialType` from `@nestjs/mapped-types` (a new dependency, so ask first) over a `PickType` of the create DTO; a service method; a controller route.
- **Gotchas:** an empty body must return 400; `forbidNonWhitelisted` must still reject `productToken`/`id`; `PartialType` keeps validators but makes fields optional.

## Drill 2: Atomic stock decrement for orders (target: 20 min)
**Request:** "Two orders arrive at once. Stock must never go negative or be overwritten."
- **Spec:** new endpoint or mode, for example `POST /products/:id/stock/adjust` with `{ delta: int }` (non-zero). AC: stock never < 0; insufficient stock returns **409** (or 422; decide and log).
- **Plan:** D-6 revisited: replace read-then-write with a single atomic statement.
- **Code (Sequelize):** an `UPDATE ... SET stock = stock + :delta WHERE id = :id AND stock + :delta >= 0` (for example `Product.increment` can't guard the floor by itself, so use a conditional `update` with `Sequelize.literal`, or a transaction with `SELECT ... FOR UPDATE`). If 0 rows affected: distinguish 404 from insufficient stock with a follow-up existence check.
- **Test:** concurrent requests (`Promise.all`) that would oversell must produce exactly the allowed successes. Run it against the Docker MySQL test database; that is where real concurrency behaves like production.
- **Gotcha:** `stock` is `UNSIGNED` in MySQL: subtracting below zero can raise an error rather than going negative. The `WHERE` guard avoids ever getting there.

## Drill 3: Look up by productToken (target: 10 min)
**Request:** "Other services only know the token, not our numeric id."
- **Spec:** `GET /products/by-token/:productToken` (or a query filter on the list). This would add a lookup route beyond the v1 numeric-ID route.
- **Code:** service `findByToken` using `findOne({ where: { productToken } })`; reuse the 404 pattern; validate the param with the same token rule.
- **Gotcha:** route order. A static path like `by-token/:t` must not be shadowed by `:id`. Declare it before `:id` or use a distinct prefix.

## Drill 4: Soft delete (target: 20 min)
**Request:** "We must keep deleted products for audit."
- **Spec:** `DELETE` marks deleted; deleted products are hidden from `GET` and list, return 404; decide whether a deleted token can be reused (probably not).
- **Plan:** Sequelize `paranoid: true` adds `deletedAt` and filters automatically; decide the unique-constraint impact.
- **Code:** model option `paranoid: true`, new column in the SQL schema; `destroy` now sets `deletedAt`.
- **Gotcha:** with a soft-deleted row still occupying the unique index, creating the same token again now returns 409. That contradicts AC-5.3, so the spec must change (log it). This is the "ripple effect" interviewers love.

## Drill 5: Search and sort on the list endpoint (target: 20 min)
**Request:** "Let me search by name and sort by price."
- **Spec:** `?q=<text>`, `?sortBy=price|name|id`, `?order=asc|desc`; defaults keep AC-2.3 (order by id asc).
- **Code:** extend `PaginationQueryDto` (or add a query DTO) with `@IsIn` for the sort field (whitelist it: never pass raw user input into `ORDER BY`), `Op.like` for search with escaped wildcards.
- **Gotcha:** SQL injection through sort/order if unvalidated; `%` and `_` in the search text act as wildcards unless escaped; keep a secondary `id` order for deterministic paging.

## Drill 6: Cursor (keyset) pagination (target: 25 min)
**Request:** "Deep pages are slow. Fix it."
- **Spec:** `?after=<id>&limit=n` returning `{ data, nextCursor }`.
- **Plan:** D-7 revisited. Trade-off: no random page access and no cheap total count.
- **Code:** `where: { id: { [Op.gt]: after } }`, `order: id ASC`, fetch `limit + 1` rows to know whether there is a next page.
- **Gotcha:** keep the old offset endpoint for compatibility or version the API; discuss it.

## Drill 7: Make tokens case-insensitive (target: 10 min)
**Request:** "`sku-1` and `SKU-1` should be the same product."
- **Think:** v1 decision D-5 made tokens case-sensitive via the `utf8mb4_bin` collation. The change is the reverse: use a case-insensitive collation (for example `utf8mb4_unicode_ci`) on `productToken`, or normalise tokens in the DTO transform.
- **Spec:** AC-1.3 flips: `sku-1` after `SKU-1` now returns 409. Update the spec first and log it in `DECISIONS.md`.
- **Decide:** collation change keeps the data exactly as sent but needs a schema change (the SQL script, and a migration on a real system). Upper-casing in the DTO works without a schema change but alters what the client sent and does not protect other writers.
- **Gotcha:** the test is on real MySQL, so it proves the collation. Rebuild the test database after changing the schema.

## Drill 8: Add a field, for example `category` (target: 15 min)
**Request:** "Products need a category."
- **Spec:** column spec, validation rule, whether it is required, whether it is returned.
- **Blast radius checklist (say it aloud):** the SQL schema (and a migration in a real system, since existing rows need a default), `product.model.ts`, `ProductAttributes` and creation attributes, `CreateProductDto`, tests, README examples.
- **Gotcha:** adding a NOT NULL column to a populated table needs a default or a backfill.

## Drill 9: Health check and graceful DB failure (target: 15 min)
**Request:** "Ops needs a health endpoint."
- **Spec:** `GET /health` returns 200 when the DB is reachable, 503 otherwise.
- **Code:** `@nestjs/terminus` with a Sequelize health indicator, or a minimal handler that runs `sequelize.authenticate()`. Adding a dependency requires approval per `AGENTS.md`; state the alternative.

## Drill 10: "Why did you do it this way?" rapid fire (no code)
Practise answering each in under 30 seconds, from your own notes:
- Why REST and not a message queue?
- Why DB unique index instead of a pre-check?
- Why reject unknown fields?
- Why does the API accept and return price as a decimal string instead of a JSON number?
- Why `PATCH /:id/stock`?
- Why use real MySQL for the integration tests, and which MySQL-specific behavior does it verify?
- What did the AI get wrong, and how did you catch it?
- What would you do next with another day?
