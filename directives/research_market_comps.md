# Directive: Research Market Comps

## Purpose
Research comparable films/series for a project to inform positioning, pitch decks, budget expectations, and distribution strategy. Produces a structured comp report with box office data, audience metrics, and strategic insights.

## When to Use
- User is preparing a pitch and needs "this meets that" comparables backed by data
- User wants to understand the market landscape for their genre/concept
- User needs budget benchmarking (what did similar films cost and earn?)
- User is writing a business plan or investor deck for a film project

## Inputs
| Input | Required | Format | Notes |
|-------|----------|--------|-------|
| Project logline | Yes | Text | 1-2 sentence concept |
| Genre | Yes | String | Primary + secondary (e.g., "sci-fi / thriller") |
| Suggested comps | No | List of titles | User's initial comp ideas to validate |
| Budget tier | No | String | "micro", "low", "mid", "studio" |
| Release window | No | String | e.g., "2025 Q4", "festival circuit first" |
| Territory focus | No | String | Default: "domestic (US/CAN)" |

## Process

### Step 1: Identify Comp Candidates
- Start with user-suggested comps if provided
- Run `execution/fetch_film_data.py` with genre + keyword search to find 15-20 candidates from the last 10 years
- Filter criteria:
  - Same primary genre
  - Similar budget tier (within 2x range)
  - Similar tone/audience (based on content ratings and audience demographics)
  - Released in last 10 years (older comps are less relevant to current market)

### Step 2: Pull Data for Each Comp
For each film, fetch via `execution/fetch_film_data.py`:
- **Box office**: Domestic, international, worldwide gross
- **Budget**: Production budget (if available)
- **ROI**: Gross / Budget ratio
- **Release strategy**: Wide release, limited/platform, festival premiere, streaming
- **Audience scores**: TMDB rating, Rotten Tomatoes (audience + critics if available)
- **Runtime, rating (MPAA), release date**
- **Cast**: Lead actors (for star-power benchmarking)
- **Distribution**: Studio/distributor, streaming platform (if applicable)

### Step 3: Narrow to Final Comps
- Select 3-5 best comps based on:
  1. **Genre + tone alignment** (most important)
  2. **Budget similarity**
  3. **Recency** (prefer last 5 years)
  4. **Performance variety** (include at least 1 overperformer and 1 underperformer to show range)
- For each final comp, write a 2-3 sentence justification explaining WHY it's comparable

### Step 4: Financial Analysis
- Calculate average ROI across comps
- Calculate median domestic and worldwide gross
- Estimate revenue scenarios for the user's project:
  - **Conservative**: 25th percentile of comp performance
  - **Base case**: Median of comp performance
  - **Upside**: 75th percentile of comp performance
- Factor in release strategy (theatrical vs streaming vs hybrid)

### Step 5: Strategic Insights
- **Festival strategy**: Did comps that premiered at festivals (Sundance, TIFF, SXSW) perform better?
- **Release timing**: What quarter/month did successful comps release?
- **Cast strategy**: Did comps with name actors significantly outperform?
- **Streaming vs theatrical**: For this genre/budget, is streaming acquisition more realistic?
- **International potential**: What % of comp revenue came from international markets?

### Step 6: Generate Deliverable
- Run `execution/generate_comp_report.py` to compile into Google Sheets (data) + Google Slides (visual summary)
- **Sheets tabs**: Raw Data, Financial Summary, Scenario Analysis
- **Slides**: Title slide, Comp Overview (poster grid + key stats), Financial Scenarios, Strategic Recommendations
- Share links with user

## Outputs
| Output | Location | Format |
|--------|----------|--------|
| Raw film data | `.tmp/comps/` | JSON |
| Comp report data | Google Sheets | Shared link |
| Comp visual deck | Google Slides | Shared link |
| Comp justifications | `.tmp/comps/justifications.md` | Markdown |

## Edge Cases & Learnings
- **TMDB data gaps**: Budget data is often missing for independent films. When unavailable, estimate from known indicators (cast, locations, VFX) and mark as "estimated" in the report.
- **Streaming-only releases**: Films that went straight to streaming have no box office. Use subscriber impact metrics or estimated viewership if available; otherwise note "streaming — no public box office data."
- **International co-productions**: Some comps may have inflated international numbers due to local government incentives. Flag these.
- **Dated comps**: If user insists on comps older than 10 years, include them but add a disclaimer that market conditions have changed significantly (streaming disruption, COVID, etc.).
- **Documentary / non-fiction**: If the project is a documentary, switch comp sources to focus on doc-specific distributors and festival performance rather than wide-release box office.
- **API rate limits**: TMDB allows 40 requests/10 seconds. Batch requests in `fetch_film_data.py` with built-in throttling. Cache results in `.tmp/comps/cache/` to avoid redundant calls.
