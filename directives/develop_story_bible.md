# Directive: Develop Story Bible

## Purpose
Build a comprehensive story bible for a film or series project — the single source of truth for world, characters, tone, and narrative rules. Output is a structured Google Doc that can be shared with writers rooms, producers, and department heads.

## When to Use
- User is developing an original film or series concept from scratch
- User has a screenplay draft and wants to formalize the world-building
- User needs to onboard collaborators (co-writers, showrunners, directors) with a reference document
- User is pitching and needs a companion document to the script

## Inputs
| Input | Required | Format | Notes |
|-------|----------|--------|-------|
| Concept / logline | Yes | Text | 1-3 sentence premise |
| Genre & tone references | Yes | Text + film titles | e.g., "sci-fi thriller — tone of Arrival meets Sicario" |
| Existing screenplay | No | PDF/FDX/TXT | If available, used to extract characters and world details |
| Character notes | No | Text or JSON | Any existing character work |
| World rules | No | Text | Magic systems, tech rules, historical constraints, etc. |
| Target format | No | "feature" or "series" | Defaults to "feature" |

## Process

### Step 1: Extract or Gather Raw Material
- If a screenplay exists, run `execution/parse_screenplay.py` to extract characters, locations, and world details
- If starting from concept only, use the logline + genre to generate initial scaffolding
- Pull reference film data via `execution/fetch_film_data.py` for tone comps (runtime, genre tags, plot summaries)

### Step 2: Build Character Profiles
For each major character, create:
- **Name, age, occupation**
- **Want** (conscious goal) vs **Need** (unconscious lesson)
- **Ghost/Wound** (backstory trauma driving behavior)
- **Voice notes** (speech patterns, vocabulary, verbal tics)
- **Relationships** (map to other characters — ally, antagonist, mentor, love interest)
- **Arc summary** (where they start → what changes them → where they end)

For series: include per-season arc trajectories.

### Step 3: Build World Document
- **Setting**: Time period, locations (real or fictional), geography
- **Rules**: What's possible and impossible in this world (crucial for genre work — sci-fi, fantasy, horror)
- **Society/Culture**: Power structures, economics, social norms relevant to the story
- **Visual tone**: Color palette references, cinematography style, aspect ratio notes
- **Sound/Music tone**: Score references, diegetic vs non-diegetic music approach

### Step 4: Define Narrative Rules
- **POV approach**: Whose perspective drives the story? Subjective or omniscient?
- **Time structure**: Linear, non-linear, multi-timeline?
- **Tone guardrails**: What this story IS and ISN'T (e.g., "grounded violence, never gratuitous" or "comedy comes from character, not situation")
- **Thematic pillars**: 2-3 core themes the story must serve (e.g., "identity", "power vs responsibility")

### Step 5: Series-Specific (if applicable)
- **Episode structure**: Cold open? Teaser? Act breaks?
- **Season arc vs episode arc**: What's serialized, what's procedural?
- **Mythology vs case-of-the-week ratio**
- **Character rotation**: Who drives which episodes?

### Step 6: Generate Deliverable
- Run `execution/generate_story_bible.py` to compile all sections into a formatted Google Doc
- Structure: Cover page → Logline → World → Characters → Narrative Rules → Tone & Visual References → Series Structure (if applicable)
- Include a "Quick Reference" page at the front — 1-page summary for busy executives

## Outputs
| Output | Location | Format |
|--------|----------|--------|
| Raw character/world data | `.tmp/story_bible/` | JSON |
| Story Bible | Google Docs | Shared link |
| Character relationship map | Google Slides (1 slide) | Visual diagram |

## Edge Cases & Learnings
- **Adaptation projects**: If based on existing IP (book, article, true story), add a "Source Material" section noting what's faithful vs what's changed and why.
- **Franchise potential**: If the user mentions franchise or universe, add a "Universe Expansion" section with spinoff hooks.
- **Tone disagreements**: When tone references conflict (e.g., "funny like Tarantino but wholesome"), flag the contradiction and ask user to clarify priority.
- **Living document**: Remind user that story bibles evolve. Each directive run should UPDATE the existing doc, not replace it. Check for existing doc ID in `.tmp/story_bible/doc_id.txt` before creating new.
