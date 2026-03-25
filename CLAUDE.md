# CLAUDE.md — Pramana

## How we work together
- Do not implement anything not explicitly discussed and agreed upon
- Do not suggest stack changes without flagging them as suggestions first
- When in doubt, ask. Never assume.
- One task at a time. No scope creep.

## Debugging
- When a bug is reported, write a test that reproduces it first
- Then fix it
- Never patch symptoms — understand the root cause

## Architecture rules
- Stack is: Next.js, Supabase, Claude API, Supermemory
- Do not introduce new dependencies without explicit approval
- Privacy first — no user data leaves the backend unredacted
- Codename users before any data touches third party services

## Knowledge base
- The knowledge base schema is the core asset — do not modify without explicit approval
- Confidence scoring logic is deterministic — not to be handled by the agent
- Every recommendation must be traceable to a source

## Product principles
- The goal is user self sufficiency, not dependency
- No PED, steroid, or hormone advice ever
- Supplements only where evidence clearly supports it and fits user context and budget
- Honest about uncertainty — never fake confidence
## Code quality standards
- Readability first — code should be self explanatory, not clever
- Every function does one thing
- Reusability — if something is used twice, abstract it
- Think about scale when designing data structures and APIs — even if we don't build for scale now, don't make decisions that make scaling painful later
- No premature optimisation — but no decisions that actively prevent future optimisation