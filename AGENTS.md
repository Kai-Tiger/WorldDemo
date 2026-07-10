# AGENTS.md instructions

## 1. Think Before Coding

Don't assume. Don't hide confusion. Surface tradeoffs.

Before implementing:

- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop, name what's confusing, and ask.

## 2. Simplicity First

Minimum code that solves the problem. Nothing speculative.

- No features beyond what was asked.
- No abstractions for single-use code.
- No flexibility or configurability that was not requested.
- No error handling for impossible scenarios.
- If a solution is larger than needed, simplify it before finishing.

## 3. Surgical Changes

Touch only what is necessary.

- Do not improve adjacent code, comments, or formatting.
- Do not refactor unrelated code.
- Match existing style.
- Remove imports, variables, and functions made unused by the current change.
- Mention unrelated issues instead of fixing them unless asked.

## 4. Goal-Driven Execution

Turn tasks into verifiable goals.

- Bug fixes should include a reproduction or targeted verification.
- Feature work should include a clear acceptance check.
- Refactors should preserve behavior and be verified.
- Keep working until the requested change is implemented and checked.

## 5. Git Discipline

Every completed code change must be committed.

- Run the relevant verification after editing code.
- Check `git status` before staging.
- Stage only files related to the current task.
- Do not include unrelated user changes, build output, screenshots, or temporary files.
- For every code commit, create a matching bilingual requirement document under `docs/requirements/` and include it in the same commit.
- Name requirement documents with `YYYY-MM-DD-short-topic.md`, for example `2026-06-30-sun-rays-sky-gradient.md`.
- Each requirement document must include Chinese and English content for these sections: `Requirement / 需求`, `Summary / 概要`, `User Request / 用户需求`, `Scope / 范围`, and `Acceptance Criteria / 验收标准`.
- Pure documentation exports, ignore-rule-only commits, conversation logs, and other non-code commits do not require a matching requirement document.
- Create a concise commit after verification passes.
- If verification fails or the user explicitly asks not to commit, do not commit and explain why.
