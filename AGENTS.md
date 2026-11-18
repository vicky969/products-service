# AI guardrails for products-service

Read at the start of every session (Codex reads `AGENTS.md`; `CLAUDE.md` points here). The human (Vikram) owns every decision and must be able to explain every line to an interviewer.

## 1. Source of truth

1. `docs/01-spec.md` = what. `docs/02-plan.md` = how and why. `docs/03-tasks.md` = order of work. `docs/00-constitution.md` = non-negotiables. `docs/DECISIONS.md` = log.
2. If code and spec disagree, the spec wins until the human says otherwise. Propose spec changes, get approval, log them, then change code.
3. Every test and commit references the requirement IDs it covers (FR-n, AC-n.n, NFR-n).

## 2. Working protocol (one task per turn)

For each task in `docs/03-tasks.md`, in order:

1. **Say the plan** in 3 to 6 lines (files, IDs, tests), then proceed. No approval pause is needed unless a hard rule below is involved.
2. **Tests first.** Write the failing tests for the task's acceptance criteria and show them failing for the right reason.
3. **Smallest implementation** that passes. No extra endpoints, options or abstractions.
4. **Run everything** that applies (`npm run build`, unit tests, integration tests) and report the real output.
5. **Explain back.** Summarise what changed and why, then list the task's explain-back questions for the human. These are non-blocking: continue to the next task, but keep the questions so the human can answer them before the interview.
6. **Update docs** touched by the change in the same step.

Never implement more than one task per turn.

## 3. Hard rules (stop and ask if one would be broken)

- **No new dependency** without asking: say what it does and what the alternative is.
- **Pin and verify versions** after any install by running build and tests.
- **Do not change the stack** named in the constitution.
- **No scope creep.** Anything not in the spec (auth, caching, soft delete, Swagger, extra fields or endpoints) is out of scope.
- **No silent behaviour changes.** Status codes, response shapes and messages are part of the spec; change the spec first.
- **No secrets** in code or committed files. Only `.env.example` is committed.
- **No disabling checks to go green:** no `skip`, `any`, `@ts-ignore`, `eslint-disable` or loosened assertions. If a test is wrong, say why and propose the fix.
- **No destructive commands** (`rm -rf`, dropping tables, force push, `npm audit fix --force`) without approval.
- **Never claim something works unless it was run.** Say "not run" when it wasn't. State clearly when MySQL or Docker was not available.
- **Real MySQL only for integration tests.** Do not swap in SQLite to make tests easier.

## 4. Code standards

- TypeScript `strict`. No `any`. Explicit return types on public methods.
- Controllers: HTTP only. Services: rules and error mapping. Model: persistence. No business logic in controllers.
- Use Nest's built-in HTTP exceptions with messages a client can act on. Never leak SQL or stack traces.
- Comments explain why, not what. Non-obvious decisions get a line in `docs/DECISIONS.md`.

## 5. Communication

- Explain as if the human must repeat it to an interviewer: what, why, and the alternative.
- For a real design choice, give 2 or 3 options with trade-offs and a recommendation.
- If the spec is ambiguous, ask. Do not fill gaps with unwritten assumptions.
- Admit mistakes plainly and log notable ones in `docs/DECISIONS.md`.

## 6. Change requests

When asked to change behaviour: spec change, plan impact, tasks, tests, then code. See `docs/04-change-drills.md`. Narrate each step.

## 7. Definition of done (per task)

- Acceptance criteria for the task are covered by tests that fail without the code.
- Build and tests pass, with real output shown.
- Docs updated and decisions logged.
