# Products Service

A small HTTP service for creating, retrieving, listing, updating stock, and deleting products. It uses NestJS and TypeScript, Sequelize for persistence, and MySQL 8 for storage.

## Prerequisites

- Node.js 20 or later and npm. This checkout was verified with Node.js 26.7.0 and npm 11.19.0.
- Docker Engine with Docker Compose. The local environment was verified with Docker Compose 5.6.0.
- No separate MySQL installation is needed; Compose runs the MySQL 8 container.

## Setup and run

1. Create a local environment file and replace the password placeholders with strong local values:

   ```powershell
   Copy-Item .env.example .env
   ```

   Keep `.env` local; it is ignored by Git. Compose requires `MYSQL_ROOT_PASSWORD` and `DB_PASSWORD`. The service reads `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, and `PORT`; `.env.example` lists their local defaults.

2. Start MySQL and wait until it reports healthy:

   ```sh
   docker compose up -d mysql
   docker compose ps
   ```

   The initialization script creates `ecommerce` and the isolated `ecommerce_test` database, their `products` tables, and the application grants.

3. Install the locked dependencies and start the API:

   ```sh
   npm ci
   npm run start:dev
   ```

   The API listens on port `3000` by default. For a normal local run, `DB_NAME` defaults to `ecommerce`. Use `npm run build` followed by `npm run start` to run the compiled application.

MySQL's named volume persists data. Its initialization script runs only when the data directory is first created; changing `.env` later does not rotate existing MySQL passwords or rerun initialization. Do not remove the volume to apply configuration changes.

## Tests and build

```sh
npm test
npm run build
```

Unit tests do not need MySQL. HTTP integration tests use real MySQL and must use only `ecommerce_test`:

```powershell
$env:E2E_DB_NAME = "ecommerce_test"
npm run test:e2e
```

The equivalent Bash command is `E2E_DB_NAME=ecommerce_test npm run test:e2e`. The test runner rejects an unset or different database name before starting Jest, then sets `DB_NAME` to `ecommerce_test` for the test process. It cannot run the HTTP tests against `ecommerce`.

## API

All routes are prefixed with `/products`. Prices are decimal strings with two fractional digits. Create requests require `productToken`, `name`, `price`, and `stock`; unknown body properties are rejected. Product tokens are case-sensitive. List pagination defaults to page 1 and limit 10, caps the limit at 100, and sorts by ascending ID.

| Method | Path | Purpose | Status codes |
| --- | --- | --- | --- |
| `POST` | `/products` | Create a product | `201`, `400`, `409` |
| `GET` | `/products` | List products with pagination | `200`, `400` |
| `GET` | `/products/:id` | Retrieve a product | `200`, `400`, `404` |
| `PATCH` | `/products/:id/stock` | Set a product's stock quantity | `200`, `400`, `404` |
| `DELETE` | `/products/:id` | Permanently delete a product | `204`, `400`, `404` |

Validation errors use Nest's standard response and include all validation messages. Unexpected failures return a generic `500` response; technical details are logged server-side.

### Captured request and response examples

These requests and response bodies were captured by running the service against the real MySQL `ecommerce_test` database using `curl.exe`. The sample row used product ID `16`; it was deleted after capture. Substitute a newly returned ID and a unique token when replaying the sequence in another database.

Create:

```sh
curl.exe --silent --show-error --include --request POST 'http://127.0.0.1:3000/products' --header 'Content-Type: application/json' --data-raw '{"productToken":"readme-captured-20261119","name":"Portfolio Example","price":"24.90","stock":8}'
```

Captured response (`201 Created`):

```json
{"id":16,"productToken":"readme-captured-20261119","name":"Portfolio Example","price":"24.90","stock":8}
```

Retrieve the created product:

```sh
curl.exe --silent --show-error --include 'http://127.0.0.1:3000/products/16'
```

Captured response (`200 OK`):

```json
{"id":16,"productToken":"readme-captured-20261119","name":"Portfolio Example","price":"24.90","stock":8}
```

List products:

```sh
curl.exe --silent --show-error --include 'http://127.0.0.1:3000/products?page=1&limit=10'
```

Captured response (`200 OK`):

```json
{"data":[{"id":16,"productToken":"readme-captured-20261119","name":"Portfolio Example","price":"24.90","stock":8}],"meta":{"total":1,"page":1,"limit":10,"totalPages":1}}
```

Set stock to an absolute value:

```sh
curl.exe --silent --show-error --include --request PATCH 'http://127.0.0.1:3000/products/16/stock' --header 'Content-Type: application/json' --data-raw '{"stock":6}'
```

Captured response (`200 OK`):

```json
{"id":16,"productToken":"readme-captured-20261119","name":"Portfolio Example","price":"24.90","stock":6}
```

Delete the product:

```sh
curl.exe --silent --show-error --include --request DELETE 'http://127.0.0.1:3000/products/16'
```

Captured response: `204 No Content`, with an empty body.

On macOS or Linux, use `curl` in place of `curl.exe`. In PowerShell, `curl.exe` invokes the cURL executable rather than the `curl` alias.

## Architecture and decisions

- `AppModule` loads environment configuration and creates the Sequelize connection. `ProductsModule` groups the product controller, service, model, and DTOs.
- The controller maps HTTP routes and status codes. DTOs and a shared global `ValidationPipe` validate and transform input. The service applies product rules and maps database uniqueness and missing-row errors to HTTP exceptions.
- The SQL initialization script is the schema source; Sequelize synchronization is disabled. MySQL stores prices as `DECIMAL(10,2)`, while the TypeScript model and API preserve them as strings. A binary collation enforces case-sensitive product-token uniqueness.
- Product creation relies on the database unique index, including for concurrent requests. Stock updates set an absolute quantity and update only the stock column. Listing uses bounded offset pagination and stable ascending-ID order. Deletion is a hard delete.
- Unit tests use a mocked model and DTO validation. HTTP integration tests use the Compose MySQL test database; a fail-closed guard prevents them from selecting another database.
- Nest's standard exception shape is returned for known errors. Unexpected errors receive a generic 500 response, and their details go to the server logger.

## Scope and possible next steps

The v1 API implements create, retrieve, paginated list, stock update, and hard delete. Authentication, search/filtering, name or price updates, soft delete, and Swagger/OpenAPI are out of scope; Swagger is explicitly deferred by D-13.

Potential follow-ups, if requirements expand, include authentication before production exposure, database migrations as the schema evolves, and keyset pagination for very large catalogs. Stock updates currently use read-then-write behavior, so concurrent updates are last-write-wins; an order workflow would need an atomic conditional stock update or another concurrency strategy.
