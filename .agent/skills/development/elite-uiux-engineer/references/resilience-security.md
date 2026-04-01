# Resilience, DevOps & Security

## Graceful Degradation & UX Safety

**The app never crashes for the user.** Every failure mode has a designed recovery path.

### Error Boundary Strategy (React)
```
App
├── RootErrorBoundary        # Catches catastrophic errors → "Something went wrong" full screen
│   ├── LayoutErrorBoundary  # Catches layout errors → Fallback layout
│   │   ├── PageErrorBoundary    # Catches page errors → "This section failed" with retry
│   │   │   └── ComponentErrorBoundary  # Catches widget errors → Hides broken widget
```

**Rules:**
- Every route/page wrapped in its own error boundary
- Error boundaries show actionable UI (retry button, contact support, navigate home)
- Log errors to monitoring service (Sentry, LogRocket) with context
- Never show stack traces, raw error objects, or blank screens to users

### Optimistic UI
Update the UI immediately on user action, then reconcile with server response.

**Pattern:**
1. User clicks "Save" → UI shows saved state immediately
2. API call fires in background
3. On success → no visible change (already showing correct state)
4. On failure → revert UI, show toast/notification explaining the issue

**Use for:** Likes, toggles, reordering, simple updates. **Do not use for:** Payments, destructive actions, multi-step workflows.

### Network Resilience
- Retry failed requests with exponential backoff (1s, 2s, 4s, max 3 retries)
- Show offline indicator when network is unavailable
- Queue mutations when offline, replay when online (if applicable)
- Timeout long requests (10s default, configurable per endpoint)
- Stale-while-revalidate caching for read operations

### Loading States
- Skeleton screens for initial loads (match the layout shape)
- Inline spinners for button actions (disable button, show spinner inside it)
- Progress bars for uploads/long operations
- Never block the entire UI — isolate loading to the affected section

---

## DevOps & CI/CD

### Pipeline Structure
```
Push → Lint → Type Check → Unit Tests → Build → Integration Tests → Deploy (Staging) → E2E Tests → Deploy (Production)
```

**Rules:**
- Pipeline fails fast: lint and type check before expensive build/test steps
- All tests must pass before deployment — no "skip tests" escape hatches
- Staging environment mirrors production (same infra, same env vars structure)
- Production deploys are automated from a protected branch (main/production)
- Rollback procedure documented and tested (one-command rollback)

### Docker Patterns

**Multi-stage build (Node.js):**
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
USER node
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

**Rules:**
- Multi-stage builds to minimize image size
- Non-root user in production images
- `.dockerignore` excluding `node_modules`, `.git`, `.env`
- Pin base image versions (not `latest`)
- Health check endpoint (`/health` returning 200)

### Deployment Checklist
- [ ] Environment variables configured (no defaults for secrets)
- [ ] Database migrations applied before code deployment
- [ ] Health check endpoint responding
- [ ] SSL/TLS configured and certificates valid
- [ ] DNS pointing to correct target
- [ ] CDN cache invalidated if needed
- [ ] Monitoring and alerting configured
- [ ] Rollback procedure verified

---

## Security

### Application Security Baseline
- **Input validation:** Validate type, length, format on every user input at the API boundary. Use zod, joi, or yup.
- **Output encoding:** Escape HTML in user-generated content. React does this by default — never use `dangerouslySetInnerHTML` with unvalidated content.
- **Authentication:** Use established libraries (NextAuth, Clerk, Auth0). Never roll custom auth unless absolutely necessary. JWT for stateless, session cookies for stateful.
- **Authorization:** Check permissions on every API route, not just in the UI. UI can be bypassed.
- **CSRF protection:** Use SameSite cookies + CSRF tokens for state-changing operations.
- **Rate limiting:** Per-IP and per-user on auth endpoints, API endpoints, and file uploads.
- **Headers:** Set security headers (CSP, X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security). Use `helmet` middleware for Express.
- **Dependencies:** Run `npm audit` in CI. Use Dependabot or Renovate for automated updates. Review changelogs before updating major versions.
- **Secrets:** Never in code, never in git history. Use env vars, secret managers (Vault, AWS Secrets Manager), or platform-provided secret storage.

### Common Vulnerabilities to Check
- **XSS:** User input rendered without escaping? `dangerouslySetInnerHTML`? URL parameters reflected in page?
- **SQL Injection:** Raw queries with string concatenation? (Prisma parameterizes by default — safe. Raw queries need manual parameterization.)
- **IDOR:** Can user A access user B's data by changing an ID in the URL? Check ownership on every query.
- **Mass Assignment:** Does the API accept arbitrary fields? Whitelist allowed fields explicitly.
- **Open Redirects:** Does any redirect use unvalidated user input for the target URL?
- **File Upload:** Validate file type, size, and scan for malware. Never serve uploaded files from the same domain.

### Red Team Mindset
When reviewing code or architecture, ask:
1. What happens if a malicious user sends unexpected input?
2. What happens if authentication is bypassed?
3. What data is accessible if authorization checks are missing on this endpoint?
4. What happens if this third-party service is compromised?
5. Can rate limits be circumvented?
6. Are there timing attacks possible on auth flows?
