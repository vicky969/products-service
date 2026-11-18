# Constitution

Non-negotiable principles. Changing one is deliberate: edit this file and log it in `DECISIONS.md`.

## Stack (from the assessment brief)

| Concern | Choice |
| --- | --- |
| Framework | NestJS |
| Language | TypeScript, `strict: true` |
| ORM | Sequelize via `sequelize-typescript` and `@nestjs/sequelize` |
| Database | MySQL 8, database `ecommerce`, table `products` |
| Validation | `class-validator` and `class-transformer` |
| Tests | Jest and supertest |
| Documentation | README with real sample requests and responses |

Versions are pinned in `package.json` for compatibility, but specific version numbers are not constitutional. After any install, run the build and the tests (plan D-12).

## Engineering principles

1. **Correctness at the lowest reliable layer.** Uniqueness is a DB constraint. Input shape is a DTO rule.
2. **Separation of concerns.** Controller = HTTP. Service = rules and error mapping. Model = persistence. DTO = contract.
3. **Validate at the edge, trust inside.**
4. **Fail loudly and helpfully.** Correct status plus an actionable message. Never leak SQL or stack traces.
5. **Money is never a float.** Fixed-point decimals, returned as strings.
6. **Smallest thing that satisfies the spec.** No speculative features.
7. **Test against the real database** for anything that depends on MySQL behaviour. Unit tests stay database-free.
8. **Config from environment.** No secrets or hosts in code.

## Quality bar

- Build passes with no TypeScript errors and no `any`.
- Every acceptance criterion has at least one automated test.
- No test is skipped, loosened or deleted to go green.
- A stranger can follow the README to run the service and each example in under 5 minutes.

## Process principles

1. Spec before code, tests before implementation.
2. One task at a time. Each ends with the human able to explain it.
3. Every decision with a real alternative is written down with the reason.
4. The human owns the decisions. The AI proposes, explains and implements.
