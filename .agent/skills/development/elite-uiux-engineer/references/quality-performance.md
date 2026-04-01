# Quality, Testing & Performance

## Testing Strategy

### Test Pyramid
```
        /  E2E  \          Few — slow, expensive, high confidence
       / Integration \     Some — moderate speed, test boundaries
      /   Unit Tests   \   Many — fast, cheap, test logic
```

**Unit tests:** Pure functions, business logic, utilities, hooks. Fast, isolated, no external dependencies. Mock external calls. Aim for high coverage on `services/` and `lib/`.

**Integration tests:** API routes with real (test) database. Component rendering with mocked API responses. Test that layers work together correctly. Use test database that resets between runs.

**E2E tests:** Critical user flows only (signup, login, core feature happy path, payment). Run in CI against staging. Use Playwright (preferred) or Cypress. Don't E2E test everything — it's slow and brittle.

### TDD Workflow
1. Write a failing test that describes the desired behavior
2. Write the minimum code to make it pass
3. Refactor while keeping tests green
4. Repeat

**When TDD is highest value:** Business logic, data transformations, validation rules, state machines. **When TDD is lower value:** UI layout, third-party integrations, prototype/spike work.

### Testing Patterns

**Component testing (React Testing Library):**
- Test behavior, not implementation. Query by role, label, text — not by CSS class or test ID.
- Simulate user actions (`click`, `type`, `select`). Don't call internal methods.
- Assert on what the user sees, not on component state.

**API testing:**
- Test request validation (reject bad input with correct error)
- Test happy path (correct input → correct response)
- Test authorization (unauthenticated → 401, wrong user → 403)
- Test edge cases (empty lists, max pagination, concurrent modifications)

**Snapshot testing:** Use sparingly. Only for components where exact output matters (email templates, serialized data). Snapshots that change often are noise, not signal.

### What to Test Checklist
- [ ] Every public function in `services/` has unit tests
- [ ] Every API endpoint has integration tests (happy + error paths)
- [ ] Every form has validation tests
- [ ] Auth flows have E2E tests
- [ ] Core business workflow has E2E test
- [ ] Edge cases: empty state, error state, loading state, max length input

---

## Debugging & Root Cause Analysis

### Systematic Debugging Process
1. **Reproduce consistently.** If you can't reproduce it, you can't fix it. Get exact steps, environment, and input data.
2. **Isolate the layer.** Is the problem in: UI rendering? State management? API request/response? Business logic? Database query? Infrastructure?
3. **Bisect.** Narrow scope by 50% each step. Comment out half the code. Check if problem persists. Repeat.
4. **Check assumptions.** Log the actual values at each step. The bug is often that a value isn't what you think it is.
5. **Find root cause, not symptom.** "The button doesn't work" is a symptom. "The click handler references stale state because it's not in the dependency array" is a root cause.
6. **Fix and verify.** Fix the root cause. Write a test that would have caught it. Confirm no regressions.

### Common Bug Categories

**State bugs:** Stale closures, missing dependency arrays, race conditions between concurrent updates, state not resetting on navigation.

**Async bugs:** Unhandled promise rejections, requests returning out of order, missing loading/error states, cleanup not running on unmount.

**Type bugs:** `undefined` propagating silently, string where number expected, optional field accessed without null check, API response shape mismatch.

**Environment bugs:** Works locally but not in staging/production. Check: env vars, API URLs, CORS, SSL, database connection, file paths, timezone.

### Debugging Tools
- **Browser DevTools:** Network tab (API calls), Console (errors), React DevTools (component tree + state), Performance tab (rendering bottlenecks)
- **Node.js:** `--inspect` flag + Chrome DevTools, structured logging (pino/winston), `node --trace-warnings`
- **Database:** Query logs (Prisma: `log: ['query']`), `EXPLAIN ANALYZE` for slow queries
- **Mobile:** Flipper (React Native), Xcode Instruments (iOS), Android Profiler

---

## Performance & Core Web Vitals

### Core Web Vitals Targets
- **LCP (Largest Contentful Paint):** Under 2.5s. Optimize: critical rendering path, image loading, server response time.
- **INP (Interaction to Next Paint):** Under 200ms. Optimize: event handlers, main thread work, long tasks.
- **CLS (Cumulative Layout Shift):** Under 0.1. Optimize: explicit dimensions on images/embeds, font loading strategy, no injected content above the fold.

### Frontend Performance Checklist
- [ ] Images: Next/Image or explicit width/height, lazy loading below fold, WebP/AVIF format, responsive srcset
- [ ] Fonts: `font-display: swap`, preload critical fonts, subset to needed characters
- [ ] JavaScript: Code-split by route, lazy load heavy components, tree-shake unused code
- [ ] CSS: Purge unused styles (Tailwind does this by default), critical CSS inline
- [ ] Caching: Static assets with immutable cache headers, API responses with appropriate cache-control
- [ ] Third-party scripts: Load async/defer, evaluate if each is truly needed, self-host critical scripts

### Backend Performance Checklist
- [ ] Database queries: N+1 eliminated, proper indexes, paginated results
- [ ] API responses: Only return needed fields, compress with gzip/brotli
- [ ] Caching: Redis for hot data, HTTP cache headers, CDN for static assets
- [ ] Connection pooling: Database and HTTP client connections reused
- [ ] Background jobs: Heavy computation off the request path

### Profiling Workflow
1. Measure with Lighthouse (lab) and CrUX/RUM (field data)
2. Identify the single biggest bottleneck
3. Fix it
4. Re-measure
5. Repeat until targets are met

Do not optimize based on intuition. Measure, then optimize.

---

## SEO Fundamentals

**Technical SEO checklist:**
- [ ] Server-side rendering or static generation for crawlable pages
- [ ] Semantic HTML (`h1`-`h6` hierarchy, `main`, `article`, `nav`)
- [ ] Meta tags: title (unique per page, under 60 chars), description (under 160 chars), canonical URL
- [ ] Open Graph and Twitter Card meta for social sharing
- [ ] Structured data (JSON-LD) for rich results where applicable
- [ ] Sitemap.xml generated and submitted
- [ ] robots.txt configured correctly
- [ ] 301 redirects for moved/renamed pages
- [ ] 404 page that helps users navigate
- [ ] Page speed (LCP under 2.5s — Google ranking factor)
- [ ] Mobile-friendly (responsive, no horizontal scroll)
- [ ] HTTPS (ranking factor)

**Geo-location SEO:**
- `hreflang` tags for multi-language/multi-region content
- Locale-specific URLs (`/en/about`, `/es/about`)
- Local business schema markup for physical locations
- Region-specific content in locale files, not just translated text
