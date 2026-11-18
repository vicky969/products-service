# Specification: products-service

Status: **v2** (19 decisions approved 2026-11-18; see `DECISIONS.md`)
Source: Scalapay "Backend/Full Stack Software Engineer" assessment brief

## 1. Purpose

A backend microservice, `products-service`, that manages the product catalogue of an e-commerce platform. Clients create, read, update the stock of, and delete products over HTTP/JSON.

## 2. Scope

**In scope:** the five operations below, validation, error handling, a `products` MySQL table, tests, README documentation with real sample requests and responses.

**Non-goals (v1):** authentication, ordering, search/filtering, soft delete, caching, price/name updates, timestamps, Swagger/OpenAPI, containerising the app itself, message-queue transport.

The brief says "microservice" but also "endpoints" and "http codes", so v1 is **HTTP REST** (plan D-1).

## 3. Data model

Database `ecommerce`, table `products`. The SQL script is the only schema source; Sequelize `sync` is disabled.

| Column | Type | Constraints |
| --- | --- | --- |
| `id` | INT UNSIGNED | primary key, auto-increment, server-generated |
| `productToken` | VARCHAR(64), **binary collation** (`utf8mb4_bin`) | NOT NULL, UNIQUE. Binary collation makes uniqueness case-sensitive: `sku-1` and `SKU-1` are different tokens |
| `name` | VARCHAR(255) | NOT NULL |
| `price` | DECIMAL(10,2) | NOT NULL, >= 0 |
| `stock` | INT | NOT NULL, **no default**, must be >= 0 (enforced by validation) |

No `createdAt`/`updatedAt` columns in v1. The model sets `timestamps: false`.

## 4. Functional requirements

Every acceptance criterion (AC) must be covered by an automated test.

### FR-1 Create a product

`POST /products` with `{ productToken, name, price, stock }`. All four fields are required.

- **AC-1.1** Valid body: **201** with `{ id, productToken, name, price, stock }`. `price` is a **string** with two decimals, for example `"29.95"`.
- **AC-1.2** Existing `productToken` (exact, case-sensitive match): **409**, message `A product with productToken "<token>" already exists`; nothing created.
- **AC-1.3** `sku-1` and `SKU-1` are different tokens: both can exist.
- **AC-1.4** Invalid body (FR-6): **400** listing **all** violations.
- **AC-1.5** Unknown properties (for example `id`): **400** (`property id should not exist`).
- **AC-1.6** Missing `stock` (or any field): **400**. There is no default stock.

### FR-2 List products (paginated)

`GET /products?page=<n>&limit=<n>`

- **AC-2.1** No query: **200**, `page=1`, `limit=10`.
- **AC-2.2** Shape: `{ "data": [product...], "meta": { "total", "page", "limit", "totalPages" } }`.
- **AC-2.3** Ordered by `id` ascending.
- **AC-2.4** `page` beyond the last page: **200**, `data: []`, correct `meta.total`.
- **AC-2.5** `page < 1`, non-integer `page`/`limit`, `limit < 1` or `limit > 100`: **400**.
- **AC-2.6** No products: `data: []`, `total: 0`, `totalPages: 0`.

### FR-3 Get a product

`GET /products/:id`

- **AC-3.1** Existing id: **200** with the product.
- **AC-3.2** Unknown id: **404**, `Product with id <id> not found`.
- **AC-3.3** Non-integer id: **400**.

### FR-4 Update stock

`PATCH /products/:id/stock` with `{ stock }`. Sets stock to the given absolute quantity. Name and price cannot change in v1.

- **AC-4.1** Existing product, valid `stock`: **200** with the updated product; other fields unchanged.
- **AC-4.2** `stock: 0` is allowed.
- **AC-4.3** Negative, non-integer or missing `stock`: **400**.
- **AC-4.4** Extra properties (for example `price`): **400**.
- **AC-4.5** Unknown id: **404**.

### FR-5 Delete a product

`DELETE /products/:id` (hard delete).

- **AC-5.1** Existing id: **204**, no body; a following `GET` returns 404.
- **AC-5.2** Unknown id: **404**.
- **AC-5.3** After deletion the same `productToken` can be used again.

### FR-6 Input validation rules

| Field | Rule |
| --- | --- |
| `productToken` | string, trimmed, not empty, max 64, only letters, digits, `-`, `_` |
| `name` | string, trimmed, not empty, max 255 |
| `price` | JSON number, finite, >= 0, at most 2 decimal places, <= 99,999,999.99 |
| `stock` | integer, >= 0, <= 2,147,483,647 |
| `page` | integer >= 1 (default 1) |
| `limit` | integer 1-100 (default 10) |
| `:id` | integer |

Whitespace is trimmed before validation, so a value that is only spaces is rejected as empty. Unknown body properties are rejected, not ignored. Price is **accepted as a JSON number and returned as a decimal string** (decision D-4).

## 5. Non-functional requirements

- **NFR-1 Error shape.** Errors use Nest's standard body: `statusCode`, `message` (string, or string array for validation) and an `error` label. All validation failures are returned together. Unexpected errors return **500** with a generic message; details go to the server log only, and no SQL or stack trace reaches the client.
- **NFR-2 Uniqueness under concurrency.** Two simultaneous creates with the same token produce exactly one success and one 409. The database unique index enforces this.
- **NFR-3 Configuration.** DB host, port, user, password and name come from environment variables with local defaults. `.env.example` documents them.
- **NFR-4 Testability.** Unit tests need no database. Integration (HTTP) tests run against a **real MySQL** in Docker Compose, using an isolated test database. The README documents the commands.
- **NFR-5 Documentation.** README with setup, endpoints, real captured requests and responses, design decisions and limitations.
- **NFR-6 Logging.** Nest's built-in logger; log notable events and unexpected errors.

## 6. Open questions resolved

| # | Question | Decision |
| --- | --- | --- |
| Q-1 | Route by `id` or `productToken`? | `id` |
| Q-2 | Stock endpoint: absolute value or delta? | absolute |
| Q-3 | Price updatable? | no |
| Q-4 | Message transport? | no, HTTP REST |
