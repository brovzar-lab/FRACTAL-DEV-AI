# Directive: Analyze Screenplay

## Purpose
Take a screenplay (PDF, FDX, or plain text) and produce a structured analysis covering structure, characters, themes, pacing, and marketability. Output is a Google Doc or Sheets deliverable the user can share with collaborators.

## When to Use
- User provides a screenplay file and asks for feedback, coverage, or analysis
- User wants to evaluate a script before submitting to contests, agents, or producers
- User wants comparative analysis against successful films in the same genre

## Inputs
| Input | Required | Format | Notes |
|-------|----------|--------|-------|
| Screenplay file | Yes | PDF, FDX, TXT, or Fountain (.fountain) | Place in `.tmp/screenplays/` |
| Genre | Yes | String | e.g., "thriller", "romantic comedy" |
| Comparison titles | No | List of film titles | Used for tone/structure benchmarking |
| Focus areas | No | List | e.g., ["dialogue", "structure", "character arcs"] |

## Process

### Step 1: Parse the Screenplay
- Run `execution/parse_screenplay.py` to extract structured data
- Output: `.tmp/parsed/{filename}_parsed.json` containing scenes, characters, dialogue, action lines, page counts per act
- If FDX format, the parser handles Final Draft XML natively
- If PDF, uses text extraction with screenplay-aware formatting detection

### Step 2: Structural Analysis
Evaluate against standard screenplay structure:
- **Three-Act Structure**: Inciting incident (p10-15), midpoint (p55-60), Act 2 break (p85-90), climax (p100-110)
- **Blake Snyder Beat Sheet**: Opening image, theme stated, catalyst, debate, B-story, midpoint, all is lost, dark night, break into 3, finale, final image
- **Page count**: Flag if significantly over/under 90-120 pages
- **Scene count and average length**: Flag scenes over 5 pages (potential pacing issue)

### Step 3: Character Analysis
- Dialogue distribution (% of total dialogue per character)
- Character introduction quality (are they introduced with a clear visual/action?)
- Arc tracking: does the protagonist change from page 1 to the final page?
- Bechdel test pass/fail (two named women talk about something other than a man)
- Voice distinctiveness: can you tell characters apart by dialogue alone?

### Step 4: Dialogue & Craft Analysis
- Dialogue-to-action ratio per act
- On-the-nose dialogue detection (characters stating subtext explicitly)
- Parenthetical overuse
- Passive voice in action lines
- "We see" / "we hear" camera direction flags (spec script red flags)

### Step 5: Market & Comp Analysis
- If comparison titles provided, run `execution/fetch_film_data.py` to pull box office, genre, runtime, audience scores from TMDB
- Compare structural beats to comps
- Estimate budget tier (micro <$1M, low $1-5M, mid $5-30M, studio $30M+) based on locations, cast size, VFX indicators

### Step 6: Generate Deliverable
- Run `execution/generate_coverage_doc.py` to produce the final report
- Format: Google Doc with sections matching Steps 2-5
- Include a 1-page executive summary at the top (logline, genre, comparable titles, overall PASS/CONSIDER/RECOMMEND rating)
- Share link with user

## Outputs
| Output | Location | Format |
|--------|----------|--------|
| Parsed screenplay data | `.tmp/parsed/` | JSON |
| Coverage report | Google Docs | Shared link |
| Character breakdown | Google Sheets (tab) | Table |

## Edge Cases & Learnings
- **Non-standard formatting**: Some screenplays use unconventional formatting. The parser should fall back to line-length heuristics (dialogue is centered, action is full-width, scene headers are ALL CAPS starting with INT./EXT.)
- **TV pilots vs features**: If page count is 25-65 pages, ask user if this is a TV pilot. Adjust structure expectations accordingly (teaser + 4-5 acts for network, no act breaks for streaming).
- **Multilingual scripts**: Flag but don't fail. Note which scenes contain non-English dialogue.
- **API rate limits**: TMDB allows 40 requests/10 seconds. The fetch script handles this with built-in throttling.
