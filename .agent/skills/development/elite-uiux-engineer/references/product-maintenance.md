# Product Strategy & Maintenance

## Product Management Integration

### User Story Format
```
As a [user type],
I want to [action],
so that [benefit/outcome].

Acceptance Criteria:
- [ ] Given [context], when [action], then [expected result]
- [ ] Given [context], when [action], then [expected result]
- [ ] Edge case: [description] → [expected behavior]
- [ ] Error case: [description] → [expected behavior]
```

**Rules:**
- Every feature starts with a user story before code
- Acceptance criteria are testable (they become test cases)
- Include error and edge cases in acceptance criteria, not as afterthoughts
- "As a developer" stories are valid for DX improvements, tooling, refactoring

### Feature Scoping
Before building, answer:
1. **What problem does this solve?** (Not "what does it do" — why does the user need it?)
2. **What's the smallest version that delivers value?** (MVP, not v1.0)
3. **What are we explicitly not building?** (Scope boundaries prevent creep)
4. **How will we know it's working?** (Success metric — usage, conversion, error reduction)
5. **What's the rollback plan?** (Feature flag? Revert commit? Data migration reversal?)

### Feature Flag Discipline
- Use feature flags for anything that touches production users
- Flags have an owner and an expiration date
- Remove flag and dead code path within 2 weeks of full rollout
- Never nest flags (flag A inside flag B = combinatorial nightmare)

---

## Documentation

### Code Documentation

**What to document (the "why"):**
- Non-obvious business logic ("We round down here because the accounting team requires conservative estimates")
- Workarounds with context ("Safari doesn't support X, so we do Y. Remove when Safari 19+ is minimum target")
- Architecture decisions ("We use queue-based processing here instead of synchronous because volume exceeds 1000/min")

**What not to document (the "what"):**
- Self-explanatory code (good naming eliminates most need for comments)
- TODO comments without tickets (they rot — create an issue instead)
- Commented-out code (delete it, git remembers)

### Project Documentation

**README.md essentials:**
```
# Project Name
One-line description.

## Getting Started
Prerequisites, install steps, run commands.

## Architecture
High-level diagram or description. Where does code live? How do layers communicate?

## Development
How to run locally, run tests, create migrations, deploy.

## Environment Variables
Table of required env vars with descriptions (not values).
```

**ADR (Architecture Decision Records):**
For significant technical decisions, document:
```
# ADR-001: [Title]
Date: [Date]
Status: [Accepted / Superseded by ADR-XXX]

## Context
[What problem/situation led to this decision]

## Decision
[What we decided and why]

## Alternatives Considered
[What else we considered and why we rejected it]

## Consequences
[What this decision means for the project going forward]
```

---

## Code Archaeology & Refactoring

### Assessing Legacy Code

**Triage framework:**
1. **Read before judging.** Understand why it was written this way. Previous developers had constraints you may not see.
2. **Map dependencies.** What depends on this code? What does it depend on? How far does a change ripple?
3. **Identify test coverage.** Existing tests? If not, write characterization tests before changing anything.
4. **Score severity:**
   - **Critical debt:** Causes bugs, security vulnerabilities, or data loss. Fix immediately.
   - **Structural debt:** Makes development slower (tangled architecture, god objects, circular deps). Fix when touching adjacent code.
   - **Cosmetic debt:** Inconsistent naming, outdated patterns, style violations. Fix incrementally or ignore.

### Refactoring Patterns

**Extract function:** Long function doing multiple things → break into named functions by responsibility.

**Extract component:** React component over 200 lines or with multiple responsibilities → split into focused components.

**Replace conditional with polymorphism:** If/else chains switching on type → separate implementations per type.

**Introduce interface/type:** Function that accepts or returns `any` → define and enforce the shape.

**Consolidate duplicate code:** Same logic in 3+ places → extract to shared utility or hook.

### Safe Refactoring Rules
1. **Never refactor and add features in the same change.** Separate commits, separate PRs.
2. **Write tests first.** If existing tests are insufficient, add characterization tests that document current behavior before changing it.
3. **Small steps.** Each step should pass all tests. If a refactor requires breaking tests for an extended period, the steps are too large.
4. **Preserve behavior.** Refactoring changes structure, not function. If tests break, either the refactor changed behavior (wrong) or the tests were testing implementation details (fix the tests first).
5. **Clean as you go.** When touching a file for a feature, leave it slightly better. Fix one naming inconsistency, extract one utility, add one missing type.

### Technical Debt Tracking
Maintain a living document or tag system:
```
Category      | Location           | Impact    | Effort | Priority
Critical      | auth/session.ts    | Security  | Medium | P0 — Now
Structural    | api/routes/*       | Velocity  | Large  | P1 — Next sprint
Structural    | components/legacy/ | Velocity  | Medium | P2 — When touching
Cosmetic      | utils/helpers.ts   | Readability| Small | P3 — Opportunistic
```

Score: Impact (High/Med/Low) x Effort (Small/Med/Large) = Priority. High-impact small-effort items first.

### Dependency Maintenance
- Run `npm outdated` monthly
- Update patch/minor versions in batch (test after)
- Update major versions individually (read changelog, test thoroughly)
- Remove unused dependencies (`npx depcheck`)
- Audit for vulnerabilities (`npm audit`) in CI pipeline
- Pin exact versions in production (`package-lock.json` committed)
