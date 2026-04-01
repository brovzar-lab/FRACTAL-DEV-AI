# Backend, Data & AI Integration

## API Design Patterns

**RESTful conventions:**
```
GET    /api/projects          → List (paginated)
GET    /api/projects/:id      → Read single
POST   /api/projects          → Create
PATCH  /api/projects/:id      → Partial update
DELETE /api/projects/:id      → Delete
```

**Response envelope pattern:**
```json
{
  "data": { ... },
  "meta": { "page": 1, "total": 42 },
  "error": null
}
```

**Error response pattern:**
```json
{
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "details": [{ "field": "email", "issue": "Invalid format" }]
  }
}
```

**API design rules:**
- Consistent status codes: 200 (ok), 201 (created), 204 (no content), 400 (validation), 401 (unauth), 403 (forbidden), 404 (not found), 409 (conflict), 429 (rate limit), 500 (server error)
- Pagination: cursor-based for large datasets, offset for admin UIs
- Filtering: query params (`?status=active&sort=-createdAt`)
- Versioning: URL prefix (`/api/v1/`) or header-based
- Rate limiting: per-user and per-endpoint
- Request validation: validate at the API boundary, never trust client input

## Node.js Best Practices

**Project structure:**
```
src/
  routes/          # Route handlers (thin — validate, delegate, respond)
  services/        # Business logic (pure functions where possible)
  repositories/    # Database access (Prisma queries)
  middleware/      # Auth, validation, error handling, logging
  lib/             # Shared utilities, API clients, constants
  types/           # TypeScript types/interfaces
```

**Separation of concerns:** Routes handle HTTP (parse request, call service, format response). Services contain business logic (no HTTP awareness). Repositories handle data access (no business logic).

**Error handling:**
- Custom error classes extending Error (ValidationError, NotFoundError, AuthError)
- Global error handler middleware that maps error types to HTTP status codes
- Never expose stack traces or internal details to clients in production
- Log errors with context (request ID, user ID, input that caused the error)

**Environment config:**
- Use `.env` for local, environment variables for production
- Validate all env vars at startup (fail fast, not at first use)
- Never commit secrets. Use `.env.example` for documentation.

**Performance:**
- Connection pooling for databases (Prisma handles this)
- Streaming for large responses
- Background jobs for heavy computation (Bull/BullMQ, or serverless queues)
- Cache aggressively: HTTP cache headers, Redis for hot data, in-memory for config

## Business Logic Isolation

**Principles:**
- Business logic lives in `services/`, not in routes, middleware, or components
- Services are framework-agnostic (no Express req/res, no React hooks)
- Services accept plain objects and return plain objects
- Complex workflows use a pipeline/chain pattern with clear step names
- Side effects (email, notifications, analytics) triggered after core logic, not inside it

**Pattern for complex operations:**
```typescript
// services/project.ts
async function createProject(input: CreateProjectInput): Promise<Project> {
  validate(input)                    // Throw if invalid
  const project = await db.create(input)  // Persist
  await notify(project.ownerId)      // Side effect
  await trackEvent('project_created') // Analytics
  return project
}
```

## Database Architecture

**Schema modeling principles:**
- Normalize first, denormalize for measured performance needs
- Every table has: `id` (UUID or cuid), `createdAt`, `updatedAt`
- Use soft deletes (`deletedAt`) for user-facing data, hard deletes for system data
- Foreign keys enforced at database level, not just application level
- Index every column used in WHERE, JOIN, or ORDER BY
- Composite indexes for multi-column queries (leftmost prefix rule)

**Prisma patterns:**
```prisma
model Project {
  id        String   @id @default(cuid())
  title     String
  status    Status   @default(DRAFT)
  ownerId   String
  owner     User     @relation(fields: [ownerId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([ownerId])
  @@index([status, createdAt])
}
```

**Query optimization:**
- Select only needed fields (`select` in Prisma)
- Avoid N+1 queries (use `include` or batch queries)
- Use transactions for multi-table writes
- Paginate with cursor-based pagination for large tables
- Use raw SQL via `$queryRaw` only when Prisma's query builder can't express the query

**Migration discipline:**
- One migration per logical change
- Never edit a migration after it's been applied to production
- Test migrations on a copy of production data before deploying
- Rollback plan for every migration

## AI/LLM API Integration

**Architecture for AI features:**
```
Client → API Route → AI Service → LLM Provider (OpenAI/Anthropic/etc.)
                        ↓
                   Prompt Template
                        ↓
                   Response Parser
                        ↓
                   Validation/Sanitization
```

**Best practices:**
- Abstract the LLM provider behind a service interface (swap providers without touching routes)
- Prompt templates as versioned files or database records (not hardcoded in code)
- Streaming responses for long completions (SSE or WebSocket to client)
- Timeout and retry with exponential backoff
- Token budget management: estimate input tokens, set max output, track costs
- Cache identical prompts when responses are deterministic
- Sanitize LLM output before using in application logic or displaying to users
- Rate limit AI endpoints more aggressively than standard endpoints
- Structured output: use JSON mode or tool/function calling for machine-readable responses
- Graceful fallback when AI service is unavailable (degrade to non-AI flow or informative error)

**Cost control:**
- Log every API call with token counts and latency
- Set per-user and per-day token budgets
- Use smaller/cheaper models for simple tasks (classification, extraction)
- Reserve larger models for complex generation
- Batch requests when possible
