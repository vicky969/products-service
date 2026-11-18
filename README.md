# products-service: build it with spec-driven development

You are going to build the Scalapay `products-service` assessment **yourself, with AI as a pair**, driven by written specs and guardrails. By the end you will have the working service, a paper trail of decisions, and the ability to explain and change any part of it.

## What spec-driven development (SDD) is, in two minutes

Normal "vibe" AI coding: you describe a feature in chat, the AI writes code, you hope it is right. The reasoning lives only in the chat.

SDD flips it: **the written spec is the primary artifact and the code is derived from it.**

```
Constitution  ->  Spec  ->  Plan  ->  Tasks  ->  Implement  ->  Review
 (rules that      (what &    (how &    (small,    (AI writes     (you check
  never change)    why)       why this) ordered)   tests+code)    vs the spec)
```

| Stage | Question it answers | File |
| --- | --- | --- |
| Constitution | What are the non-negotiables (stack, quality bar)? | `docs/00-constitution.md` |
| Spec | What must the system do, and how do we know it did? | `docs/01-spec.md` |
| Plan | How will we build it, and why this way over the alternatives? | `docs/02-plan.md` |
| Tasks | What is the smallest next step? | `docs/03-tasks.md` |
| Guardrails | How is the AI allowed to work? | `AGENTS.md` (`CLAUDE.md` points to it) |
| Decisions log | What did we decide or change along the way, and why? | `docs/DECISIONS.md` |
| Change drills | How do I change it when the interviewer asks? | `docs/04-change-drills.md` |

Why this helps you specifically:

- **Explaining:** every choice has a written "why" and a rejected alternative, so you can answer "why did you do X?" from your own notes.
- **Changing code live:** when requirements change you edit the spec first, then follow the impact down to code. You already know where everything lives and which tests protect it.
- **Controlling AI:** guardrails and small tasks keep the AI from running ahead, adding things you did not ask for, or hiding mistakes.

## How to use this repo

1. **Read the docs in order (about 20 minutes):** constitution, spec, plan, tasks. Edit anything you disagree with. These are yours. The choices are my recommendations, not commandments, and changing a decision on purpose and recording it is exactly the skill being tested.
2. **Open the folder in your AI tool** (Codex reads `AGENTS.md`; other assistants can be pointed at it). Start with:

   > Read AGENTS.md and docs/. We are on Task 0. Follow the working protocol.

3. **Loop through the tasks, one at a time.** For each: the AI states a short plan, writes tests first, implements, shows real test output, and lists the explain-back questions. The questions don't block progress, but **answer them in your own words, out loud if you can**, before the interview. If you can't, ask the AI to explain until you can.
4. **Keep `docs/DECISIONS.md` current.** Every time something is decided, changed or goes wrong, one entry. This becomes your interview script.
5. **When Tasks 0-10 are done, run the change drills** in `docs/04-change-drills.md`, ideally with a timer.
6. **Compare with the earlier reference build** (the separate `products-service` project) only *after* you have attempted a task. It differs on purpose in places (SQLite tests, price as a number, Swagger), because the decisions changed on 2026-11-18. Differences are discussion points.

## Getting more out of the AI

- Ask "what are the alternatives and why not those?" at every plan step.
- Ask "what could break this?" after every implementation.
- Ask it to review its own work against the spec's acceptance criteria and list any gaps.
- If an answer sounds confident but you can't verify it, make it run the code.

## Using a spec tool instead

This repo is deliberately tool-free (just markdown) so you see every moving part. There are tools that automate the same stages (GitHub's Spec Kit is one); once you understand the loop, you could use one on your next project. Check their current docs rather than relying on my description.
