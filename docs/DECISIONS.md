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

## Things that went wrong (fill in as you build)

Examples from the reference build, so you know what to look for:

- Latest Nest major (12) is ESM-only and failed under Jest. Fix: pin the Nest 11 line. Lesson: build and run tests after every install.
- Latest TypeScript (7) could not be used by ts-jest. Fix: pin 5.9.
- First model typing (`Model<Product>`) made `create()` require every internal Sequelize member. Fix: separate attributes and creation-attributes types.

## AC-to-test traceability (fill in during Task 8)

| AC | Test file and name |
| --- | --- |
| AC-1.1 | |
| AC-1.2 | |
| ... | |
