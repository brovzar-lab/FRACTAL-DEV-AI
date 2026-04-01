# FRACTAL STORY ROOM — Complete GSD Decision Log

All design and architecture decisions made during the GSD (Get Shit Done) build planning sessions. This document captures every question posed by GSD and every answer given, organized by phase and area.

---

## Project Overview

**App:** FRACTAL STORY ROOM
**Purpose:** Screenplay surgery suite. Takes a film screenplay PDF, AI-parses it into scenes/sequences/acts using Claude API, then provides a fractal workspace where writers can zoom between structural levels (full script → acts → sequences → scenes), analyze each level through multiple screenwriting methodology lenses, edit scenes in-place with change tracking, and manage a prioritized rewrite task list using the Epps Pass Method.

**Stack:** React 18 + Vite + TypeScript + Tailwind CSS, Firebase (Firestore, Auth, Storage, Cloud Functions), Zustand, Claude API (Sonnet 4) via Cloud Function proxy, pdf.js, TipTap, @dnd-kit, diff-match-patch. Dual theme: dark mode + warm parchment light mode.

**Context:** Internal tool for Lemon Studios (Mexican film/TV production company). Team tool for Billy + Lemon writers.

### Features in Build Order

1. Auth + Navigation Shell
2. Project Management
3. PDF Upload & AI Scene Parsing
4. Board View (Kanban)
5. Scene Detail Panel
6. AI Analysis Engine
7. Timeline View
8. Outline View
9. Color Mode Switcher
10. Notes & Task System
11. Edit Tracking
12. Epps Rewriting Passes

### Pre-Build Flags

- Features 1-5 are the app. Features 6-12 make it good. First milestone should end at Feature 5 (Scene Detail Panel) — that's the first usable product.
- Don't let GSD simplify away TipTap or @dnd-kit. Those are load-bearing choices for a writing tool.
- Firebase Cloud Functions for Claude proxy: must be v2 (not v1). v1 has a 60-second timeout that will choke on full-screenplay parsing.
- Zustand store must split early (projectStore, scriptStore, analysisStore, uiStore). One monolith store becomes unmanageable around Feature 6.

---

## Phase 2: Project Management

### Area 1: Project Creation Flow

**Q1.** When the writer clicks "New Project," do you prefer a modal dialog (stays on the project list, quick creation) or a dedicated page (feels more intentional, room for future fields)?

**A1:** Neither. "New Project" should immediately open the file picker — no modal, no dedicated page. The PDF upload IS the project creation step.

**Q2.** At creation time, should it be title-only (everything else comes from AI after PDF upload), or should there be optional fields the writer can fill manually — like genre or logline — for projects they haven't uploaded yet?

**A2:** No fields at all. The AI extracts title, genre, and logline from the screenplay PDF during parsing. Zero manual input. If the AI can't find a title on the title page, fall back to prompting the writer to type one.

**Q3.** After creating the project, should the writer land on a project workspace with an upload prompt ("Now upload your screenplay PDF"), or on the Board view placeholder (consistent with the nav structure from Phase 1)?

**A3:** After clicking "New Project" and selecting a PDF, the writer lands on a "parsing in progress" view for that project. When parsing completes, they're taken to the Board view with scenes populated. There is no empty workspace state. **(Later revised — see Area 2 Q4 below.)**

**Q4.** Should project titles have any constraints — like a character limit, uniqueness check, or trimming? Or just accept whatever the writer types?

**A4:** For the fallback title input (AI couldn't extract): trim whitespace, cap at 100 characters, no uniqueness check. For AI-extracted titles: same trimming and cap, applied automatically. Writers sometimes work on multiple drafts of the same project with the same title — forcing unique names will annoy them.

---

### Area 2: Project List Layout & Interactions

**Q1.** Card grid vs. table list — Cards feel cinematic and match the creative tool vibe from the welcome screen. Table rows are denser and more scannable. Which fits your mental model for browsing 5-15 screenplays?

**A1:** Card grid. This is a creative tool for screenwriters, not a spreadsheet. 5-15 projects is the sweet spot for cards. Table density isn't needed at that scale.

**Q2.** Each card needs title, creation date, and analysis status. When metadata exists (genre, logline, page count), should the card show all of it (richer but busier) or just title + status + date with details revealed on hover or click-through?

**A2:** Title + status + date on the card face. Genre and page count as subtle secondary text below the title. Logline only on hover or click-through — it's too long for a card and makes the grid uneven. Keep cards visually consistent in height.

**Q3.** Sort order — Always most-recent-first? Or should the writer be able to sort by title, status, or date?

**A3:** Most-recent-first, no sort controls. Under 20 projects for a small team means sorting UI is wasted effort. If this ever becomes a problem, add it later in 10 minutes.

**Q4.** When parsing is in progress for a project, how should that card look?

**A4:** The card shows an animated progress indicator — a subtle pulsing bar or shimmer effect on the card itself, with a "Parsing..." status badge replacing the normal status. The card is visible in the grid immediately after upload so the writer knows the project exists, but disabled/non-clickable until parsing completes.

**Revised navigation decision:** After upload, stay on the project list (Option A). The new card appears with a shimmer, the writer clicks in when parsing finishes. Parsing takes 30-60+ seconds — auto-navigating traps the writer watching a loading state, or yanks them out of a different project if they clicked into one while waiting. The shimmer stops and status badge updates when parsing completes. Add a subtle toast notification ("El Godin de los Cielos is ready") so they notice if scrolled away.

---

### Area 3: Delete Experience

**Q1.** Confirmation style — Simple dialog or something heavier like typing the project name to confirm?

**A1:** Simple confirmation dialog. "Delete 'El Godin de los Cielos'? This cannot be undone." with Cancel and Delete buttons. Type-to-confirm is for production databases, not a writing tool with <20 projects.

**Q2.** Access point — Kebab menu on each card? Delete button inside the project workspace? Both?

**A2:** Kebab menu on each card. That's where writers (and everyone) expect destructive actions — tucked away but findable. Don't put delete inside the project workspace yet. Card-level kebab also gives a place to hang future actions (duplicate, archive, rename) without touching workspace UI.

**Q3.** Cascade behavior — Immediate batch delete or background cleanup?

**A3:** Background cleanup via Cloud Function. The project card disappears from the list immediately (optimistic UI), then a Cloud Function cascades through subcollections. Batch-deleting deeply nested Firestore subcollections synchronously will be slow and block the UI.

**Q4.** Active parsing guard — If a project is currently parsing, should delete be available?

**A4:** Allow delete during parsing. If someone uploads the wrong PDF, making them wait 60 seconds is punishing. Show the same confirmation dialog with different copy: "Cancel parsing and delete 'El Godin de los Cielos'?" The delete triggers an abort or just lets parsing finish orphaned — the background cleanup handles leftovers either way.

---

## Gray Areas (Pre-Phase 3)

### Gray Area 1: Beat Parsing & Data Model Gap

**GSD Recommended:** Define a beats subcollection schema. Parse beats as part of the initial scene parsing call rather than a separate call.

**Decision: DISAGREE.** Don't parse beats during initial scene parsing. Beats are an analysis feature (Feature 6), not a parsing feature (Feature 3). Stuffing beat extraction into scene parsing makes that prompt do too much and degrades scene boundary detection, which is the hard problem to nail first. Beats are also methodology-dependent: Story Grid beats ≠ Save the Cat beats ≠ BMOC beats.

**Instead:** Define the beats subcollection schema now (beatNumber, content, summary, methodologyType, sceneRef) so the data model is ready. Defer beat extraction to Feature 6 — run it on-demand per scene when the writer opens a specific methodology analysis. Keeps parsing fast, cheap, and focused.

### Gray Area 2: Failure States & Recovery UX

**GSD Recommended:** Error state on the project card with a red badge. "Retry" action in kebab menu. Client-side validation catches image-only PDFs before upload. Partial failures save what was parsed.

**Decision: AGREE, with one addition.** When client-side pdf.js detects zero extractable text, show a specific message: "This PDF appears to be a scanned image. Please upload a text-based screenplay PDF." Mexican production workflows frequently involve scanned scripts, so this will come up.

### Gray Area 3: Progress Granularity

**GSD Recommended:** Use a granular parsingStep field on the project document that Firestore listeners pick up in real-time. 3-4 steps.

**Decision: AGREE.** Firestore real-time listener on a parsingStep field. Card shows current step as secondary text under the "Parsing..." badge: "Extracting text...", "Identifying scenes...", "Building structure...", "Done." 3-4 steps, not more. Don't go to "Parsing scene 14 of 47" — requires writing to Firestore on every scene, noisy and expensive.

---

## Phase 4: Board View

### Area 1: Scene Cards Before Analysis

**Q1.** Should cards have any visual differentiation before analysis — like alternating subtle tones per sequence, or a sequence color accent?

**A1:** Yes — assign each sequence a subtle left-border color accent. Use a muted palette (not the analysis health colors — reserved for Feature 9). Critical: a wall of identical cards is disorienting, and sequences are the structural unit writers think in. The color creates visual grouping. Use the same sequence colors in Outline and Timeline views later for consistency.

**Q2.** The architecture doc says cards show "character count." For a screenwriter, is character count useful at a glance? Or would page range or estimated duration be more meaningful?

**A2:** Page range ("pp. 12-15"), not character count. Screenwriters think in pages — it's how they estimate pacing, budget weight, and whether a scene is running long. Page range gives instant context: "oh, this scene is 4 pages, that's long for an interior dialogue scene."

**Q3.** Should the card show the full scene heading which can be long, or a truncated/smart version?

**A3:** Show the full scene heading, but cap at 2 lines with ellipsis. Mexican screenplays use long compound headings ("INT. CASA DE ALEJANDRO - COCINA - NIGHT") and truncating to location-only loses critical info — writers need INT/EXT, time of day, and the specific location. Two lines handles 90% of headings.

**Q4.** When the writer hovers on a card, what additional info should surface?

**A4:** Hover shows: full heading (if truncated), one-line AI summary of the scene, and character list. Keep it in a clean tooltip card, not a sprawling popover. Shadow/lift is the base hover effect on the card itself, tooltip appears after ~300ms delay so fast mouse movement across the board doesn't trigger tooltip chaos.

---

### Area 2: Fractal Zoom Navigation

**Q1.** When the writer wants to focus on a single act, should the board filter to that act (other columns disappear) or highlight/dim (other columns fade but remain visible)?

**A1:** Filter, not dim. When a writer says "Act 2 is broken," they want to live inside Act 2. Dimmed columns are visual noise. Filter to the selected act, let it expand to fill the board width so sequences get more room and cards can breathe. Clear "Back to Full Script" button or breadcrumb to zoom out. This IS the fractal metaphor — zoom in, focus, zoom out.

**Q2.** Should there be a script-level overview above the Board — like a top strip showing act health summaries or a mini-map?

**A2:** No overview strip yet. The Board IS the script overview at the top zoom level. Adding a summary strip creates two competing representations of the same data. When Timeline View (Feature 7) is built, THAT becomes the script-level overview. If anything is added now, make it dead simple: act labels at the top of each column showing page range and scene count, nothing more.

**Q3.** Breadcrumb navigation or a sidebar tree that always shows the full hierarchy?

**A3:** Breadcrumb, not sidebar tree. A persistent sidebar tree competes with the navigation sidebar. Two sidebars is a mess. Breadcrumbs are the right pattern for fractal zoom — "Script > Act 2 > Sequence 4 > Scene 12" maps perfectly to zoom levels. Keep the breadcrumb in the top bar, always visible, each segment clickable.

**Q4.** When the writer clicks a sequence header on the Board, what should happen?

**A4:** Filter to that sequence's scenes. Same logic as Q1 — the fractal model means clicking deeper = zooming in. Sequence header click filters the board to show only that sequence's scene cards, spread across full width. Breadcrumb updates to "Script > Act 2 > Sequence 4." Clicking a scene card opens the Scene Detail Panel (Feature 5). Clean three-level zoom: full script → act → sequence, with scene detail as the deepest click-through.

---

### Area 3: Beat Detail Without Beat Data

**Q1.** Given beats are deferred to Phase 6, should Phase 4 build a Beat Detail UI container?

**A1:** No beat UI container in Phase 4. Don't build placeholder UI for data that doesn't exist. The Scene Detail panel shows scene heading, scene content (TipTap editor), and original vs edited split view — that's it. Building an empty "Beats" section that says "Coming soon" is clutter that teaches writers to ignore parts of the interface.

**Q2.** Phase 4 success criteria says "Beat Detail view shows individual beat content and analysis within scene context." Since beats won't exist yet, what to do?

**A2:** Flag it as a dependency mismatch and accept partial delivery. Don't reinterpret the requirement into something watered down to check a box. Update the success criteria to say "Scene Detail panel shows scene content with TipTap editing and split view. Beat-level detail deferred to Phase 6." Be honest with the spec.

**Q3.** When beats DO arrive in Phase 6, where should they appear?

**A3:** Section within the Scene Detail panel, not a separate drill-down. Beats are sub-scene units — paragraphs of action, not standalone entities. A writer fixing a scene needs to see beats IN CONTEXT of the scene text. Make them an expandable/collapsible section below the scene editor: click a beat and it highlights the corresponding text range in the editor above. Keeps the fractal metaphor without adding a navigation level that fragments the writing experience.

**Q4.** Should the breadcrumb support a beat level from Phase 4 onward, even if it does nothing yet?

**A4:** Don't add the beat breadcrumb segment until Phase 6. A breadcrumb level that does nothing is a broken promise in the UI. Phase 4 breadcrumb stops at the scene level. Per Q3, beats probably don't warrant breadcrumb navigation at all since they're inline within the scene panel, not a separate view.

---

### Area 4: Drag-and-Drop Rules & Cascading Effects

**Q1.** Should scenes be able to move across sequences within the same act?

**A1:** Yes, allow cross-sequence moves within an act. Sequence boundaries are the AI's best guess — already acknowledged as the hardest parsing task and must be manually adjustable. Drag-and-drop across sequences IS the manual adjustment. Show a visual cue when a scene is about to land in a different sequence (target sequence column highlights or pulses). Update sequence membership in Firestore on drop.

**Q2.** Should scenes be able to move across acts?

**A2:** Allow cross-act moves, but add friction. Don't block it — writers restructure across acts all the time. When a scene drops into a different act, show a brief confirmation toast — "Moved Scene 12 from Act 1 to Act 2" with an Undo button (5-second window). No modal, no blocking dialog, just visible acknowledgment with a quick escape hatch.

**Q3.** If a writer drags the last scene out of a sequence, should that sequence disappear, show as empty placeholder, or block the move?

**A3:** Auto-cleanup — empty sequence disappears. An empty sequence placeholder is visual dead weight. If they accidentally emptied it, the undo on the move restores the scene AND the sequence. In practice, if a writer dragged the last scene out, they meant to dissolve that sequence.

**Q4.** Should sequences themselves be reorderable within an act?

**A4:** Yes, sequences should be reorderable within an act. If you're trusting writers to move scenes across sequences and acts, blocking sequence reordering is an arbitrary constraint. Make sequence headers draggable within their act column. Same undo toast pattern.

---

## Phase 5: Scene Detail Panel & Edit Tracking

### Area 1: Timeline View Without Analysis Data

**Q1.** Should the Timeline use page length as height proxy before analysis data exists, or be completely empty/placeholder until Phase 7?

**A1:** Build it with page length as the height proxy. A density map based on scene length is genuinely useful even without analysis — writers can instantly see pacing irregularities. Page length is real data already available from parsing. An empty placeholder until Phase 7 means the Timeline view sits dead in the nav for weeks.

**Q2.** When analysis data arrives, should the Timeline toggle between "Page Length" and "Tension Level" or should tension fully replace page length?

**A2:** Toggle between them, don't replace. Page length and tension measure different things. A 4-page scene can be low tension (expository conversation) or high tension (chase sequence). Writers will want both views. Make it a simple toggle in the Timeline header. When Color Mode Switcher (Feature 9) is built, these become two of the available modes.

**Q3.** For the horizontal axis, should each scene get equal width or proportional width based on page count?

**A3:** Proportional width. Equal-width bars lie about pacing — they make a 5-page scene look the same as a half-page scene. Proportional width means the writer literally sees the shape of their screenplay. The horizontal axis IS time (pages ≈ screen time at roughly 1 min/page), so proportional width makes it physically accurate.

**Q4.** When the writer clicks a scene bar on the Timeline, what should happen?

**A4:** Open the Scene Detail panel, same as Board card click. Don't zoom to the Board — that's disorienting. The Scene Detail panel is a slide-out that works from ANY view — Board, Timeline, Outline. One consistent interaction pattern: click a scene anywhere in the app, Scene Detail panel opens. Lock in this principle now and never break it.

---

### Area 2: Outline View — Beats Level & Bulk Actions

**Q1.** When beats arrive in Phase 6, should the Outline tree add a beats level, or should beats stay exclusively inside the Scene Detail panel?

**A1:** Beats stay inside the Scene Detail panel only. Don't add a beats level to the Outline tree. The Outline's job is structural overview — acts, sequences, scenes. If a scene has 6 beats and you have 50 scenes, that's 300 leaf nodes. The tree becomes a wall of text. Beats live in Scene Detail where they have room to breathe in context.

**Q2.** When the writer edits a heading in the Outline, should it update the same field everywhere (single source of truth), or is the Outline heading a separate "display name"?

**A2:** Single source of truth, always. The scene heading in the Outline, the Board card, the Timeline tooltip, the breadcrumb — all read from the same field. A separate "display name" creates a sync nightmare. When the writer edits the heading inline in the Outline, it updates everywhere instantly via Firestore listener. One field, one truth.

**Q3.** Each Outline tree node needs some visual content. How information-dense should the tree be?

**A3:** Keep it lean. Act nodes: name + scene count + page range ("Act 2 — 18 scenes, pp. 34-78"). Sequence nodes: name + scene count + page range. Scene nodes: heading + page range. No summaries in the tree — that's what hover tooltips and Scene Detail are for. The Outline's value is scanability.

**Q4.** Should the Outline support drag-and-drop reordering of scenes?

**A4:** Support drag-and-drop, mirroring the Board. The Outline is a structural editing tool, not just a read-only map. Writers who think in outlines will want to restructure here — it's easier to reorder scenes in a vertical tree than on a horizontal kanban board because you can see more scenes at once. Same rules from Phase 4: cross-sequence and cross-act moves allowed, confirmation toast with undo on cross-act moves, empty sequences auto-cleanup. Reuse @dnd-kit logic — interaction model identical, rendered vertically.

---

### Area 3: Cross-View Navigation Consistency

**Q1.** When the writer is zoomed into Act 2 on the Board and switches to Timeline, should the Timeline filter to Act 2 or show the full script with Act 2 highlighted?

**A1:** Show the full script with Act 2 highlighted. The Timeline's whole point is proportional pacing context across the entire screenplay. Filtering to one act loses the "shape of the script" value. Highlight Act 2's bars with full opacity, dim the rest to ~40% opacity. The Timeline and Board serve different purposes and shouldn't be forced into identical filter states.

**Q2.** If zoom state is shared and the writer is filtered to Act 2, should the Outline auto-expand Act 2 and collapse others, or highlight Act 2 while keeping the user's manual expand/collapse state?

**A2:** Highlight Act 2, preserve the writer's expand/collapse state. Auto-collapsing nodes the writer manually opened is hostile — they expanded those for a reason. Scroll the Outline so Act 2 is visible, apply a subtle highlight (left border accent or background tint) to the Act 2 node, but don't touch their expand/collapse choices.

**Q3.** Should the breadcrumb be view-aware?

**A3:** Breadcrumb should reflect what the current view actually supports. On Timeline, drop to "Script > Act 2" because the Timeline has no sequence-level zoom. A breadcrumb level that does nothing is a lie. Store the sequence zoom state internally so if they switch back to the Board, it restores "Script > Act 2 > Sequence 4." The breadcrumb always shows the deepest level the current view can navigate to.

**Q4.** If the writer opens Scene Detail from the Board and switches to Timeline, should the Scene Detail panel stay open or close?

**A4:** Scene Detail panel stays open. It's a slide-out panel, not a view — it overlays whatever view is active. If the writer opened Scene 12's detail from the Board and switches to Timeline, the panel persists and the Timeline highlights Scene 12's bar. Closing it on view switch forces the writer to re-find and re-click the scene, which is pointless friction.

---

### Area 4 (Phase 5): Diff View Layout & Interaction

**Q1.** Should the panel offer both inline diff and side-by-side with a toggle, or commit to inline-only?

**A1:** Inline-only. In a slide-out panel competing for space, side-by-side will have two columns of maybe 25 characters each — unreadable for screenplay text. Inline diff with color-coded additions (green) and deletions (red strikethrough) is clean and scannable. Don't build two diff renderers in Phase 5.

**Q2.** Should the diff be a togglable overlay on the editor or a separate tab/section?

**A2:** Togglable overlay. A persistent diff section eats permanent panel real estate for something the writer checks occasionally. "Show Changes" button in the panel toolbar — click it, editor shifts to diff view. Click again, back to clean editing. Simple mental model: you're either writing or reviewing, one button switches.

**Q3.** When the diff is active, should the editor remain editable or become read-only?

**A3:** Read-only when diff is active. Editing while looking at diff markers is confusing — two cognitive tasks at once in a view cluttered with red/green highlights. "Show Changes" puts you in review mode (read-only, diff visible). Click back to dismiss diff and resume editing. Also avoids the technical problem of keeping diff markers stable while the writer types.

**Q4.** Should the diff operate on raw text (character-level) or semantic blocks (paragraph-level)?

**A4:** Semantic blocks — paragraph-level diff. Character-level diffs on screenplay text will be a nightmare. A writer reformats a dialogue block, re-wraps a line, and suddenly the entire scene lights up red and green. That's noise, not signal. Use diff-match-patch at the paragraph/block level: if a dialogue block changed, show the whole block as modified. If only whitespace or line breaks changed, ignore it. The default should suppress formatting noise. Can add a "show detailed changes" toggle later.

---

### Area 5 (Phase 5): Status Workflow & Transitions

**Q1.** Should any transitions besides first-edit-to-in-progress be automatic?

**A1:** "In-progress" is the only auto-transition. Don't auto-transition to "revised" when notes are completed — completing notes doesn't mean the scene is actually revised. Auto-transitions beyond the first edit start making assumptions about the writer's process, and every wrong assumption breaks trust in the system.

**Q2.** Should "flagged" be a status the writer sets manually, a status AI sets during analysis, or both?

**A2:** Both, but visually distinct. The writer sets "flagged" manually as a bookmark. AI sets flags during analysis as diagnostic markers. Don't collapse them into the same status. "Flagged" is the manual writer status in the status dropdown. AI diagnostic flags show as small warning badges/icons on the card (Phase 7) that coexist with whatever status the scene has. A scene can be "in-progress" AND have AI flags.

**Q3.** Can statuses move backward freely, or should going backward require confirmation?

**A3:** Free movement, no confirmation. Writers change their minds constantly and statuses are organizational labels, not access controls. Adding confirmation dialogs to a status dropdown turns a one-click action into a two-click action and will train writers to stop using statuses. The edit history and diff view are the real record of progress, not the status label.

**Q4.** Should the writer be able to change status from the Board or Outline without opening Scene Detail?

**A4:** Yes — quick status selector on the Board and Outline. Right-click context menu on Board cards with status options. On the Outline, a small status dot next to each scene node that opens a dropdown on click. Writers doing triage passes should not have to open Scene Detail 20 times. The status dropdown in Scene Detail stays as the primary location, but quick access makes batch status work painless.

---

### Area 6 (Phase 5): Beat Extraction & Display

**Q1.** Should Phase 6 build only the display container, or also the beat extraction trigger?

**A1:** Phase 6 should build the extraction trigger AND the display container. A display container with no way to populate it is useless. Put a "Extract Beats" button in the Scene Detail panel that calls Claude to parse the scene into beats (methodology-agnostic structural beats for now). Phase 7 layers methodology-specific analysis ON TOP of beats that already exist. Phase 6 gets a complete deliverable: click button, see beats, click a beat, see it highlighted.

**Q2.** Should we move NAV-13 to Phase 7?

**A2:** Move NAV-13 to Phase 7. Phase 6 delivers: beat extraction trigger, beat display list, beat-to-text highlighting. Phase 7 delivers: beat-level analysis (Story Grid Five Commandments per beat, BMOC analysis, etc.). Clean split — Phase 6 owns the data and display, Phase 7 owns the intelligence layer. Update the spec.

**Q3.** Should beat-to-text mapping (character offsets) be part of the extraction prompt or computed client-side?

**A3:** Part of the extraction prompt. Don't try to match beat content against scene text client-side — screenplay formatting makes fuzzy matching unreliable. Have Claude return start and end character offsets for each beat: `{ beatNumber: 3, content: "...", startOffset: 450, endOffset: 820 }`. Validate offsets client-side (no overlap, within scene length) and flag any that look wrong for manual adjustment. The AI is already reading the text — marking WHERE beats are costs almost nothing extra.

**Q4.** Should beats be displayed as a scrollable list, inline annotations in margins, or colored highlight regions in the text?

**A4:** Colored highlight regions in the scene text, with a companion list as secondary navigation. Highlights directly in TipTap are the most intuitive — subtle background color bands for each beat. The companion list sits below the editor as a clickable index: "Beat 1: Alejandro enters the kitchen" — clicking a list item scrolls to and pulses the corresponding highlight. Two ways to navigate beats without choosing one or the other. Inline margin annotations (like code comments) feel too technical for screenwriters.

---

### Area 7 (Phase 5): Changelog Granularity & Revert Scope

**Q1.** Should changelog entries be created on explicit save, auto-save, or panel close/navigate away?

**A1:** Auto-save with smart changelog grouping. Auto-save on a 3-second debounce so the writer never loses work — non-negotiable for a writing tool. But don't create a changelog entry on every auto-save. Group edits into "sessions": new changelog entry when the writer opens a scene, collapse all auto-saves within that session into one entry, finalize when they navigate away or close the panel. Continuous save (no lost work) with clean changelogs (one entry per editing session).

**Q2.** Should revert offer any changelog entry (time travel) or just original-only?

**A2:** Revert to any changelog entry. Original-only revert is too destructive for iterative rewriting. A writer doing Epps passes will make multiple focused editing sessions over days — reverting to original nukes everything. Store each session's before/after state. The diff view shows what each entry changed so the writer can make an informed choice. Storage cost is minimal — text diffs, not full screenplay copies.

**Q3.** Should the changelog/history section be visible in Scene Detail or hidden behind a button?

**A3:** Behind a button. Changelog history is a reference tool checked occasionally. A collapsible section in Scene Detail competes for vertical space with the editor, beat highlights, and notes. "View History" button in the panel toolbar opens an overlay or drawer showing the timeline of changes with diff previews. Same pattern as "Show Changes" — keep the editing workspace clean, put review tools behind intentional clicks.

**Q4.** Should we drop the "who" field for a single-writer tool, or keep it?

**A4:** Keep the "who" field. This is a team tool for Billy + Lemon writers, not single-writer. The moment a second writer touches a scene, you'll want to know who changed what. The field costs one string in Firestore per changelog entry. Populate from Firebase Auth uid and displayName on every save.

---

## Phase 7: AI Analysis Engine

### Area 1: Analysis Trigger UX & Cost Visibility

**Q1.** Should analysis run all five lenses at once or let the writer choose?

**A1:** Let the writer choose which lenses to run, but offer an "All Lenses" convenience option. Each lens has a different prompt, and combining five methodology prompts into one call produces worse results than focused single-lens calls. A prompt holding five frameworks simultaneously degrades output quality. Let the writer pick one, multiple, or all. Run selected lenses as parallel calls (Promise.all), not one combined prompt.

**Q2.** For batch analysis, should there be a cost estimate?

**A2:** Show the cost estimate, but frame it as scene count, not dollars. "Analyze 47 scenes x 3 selected lenses = 141 analysis calls. This may take 5-8 minutes. Proceed?" Writers don't care about API pricing — they care about time. Add a small subtle line underneath: "Estimated API cost: ~$4.70" in muted text. Time estimate is the headline, cost is the footnote. Batch-analyzing an entire screenplay is a significant action and deserves a confirmation step.

**Q3.** Where does the "Analyze Scene" button live?

**A3:** Scene Detail panel toolbar, as a dropdown button alongside "Show Changes" and "View History." Clicking it opens a dropdown showing five lenses with checkboxes, plus "Select All" and "Run Analysis" confirmation. If analysis already exists for a lens, show a checkmark and "Re-analyze" option.

**Q4.** Where does the "Analyze All" batch button live?

**A4:** Board toolbar, top-right area, with parsing-style progress indicator. "Analyze All Scenes" belongs at the Board level because the Board is the script overview. Don't create a separate analysis dashboard. Put it in the Board toolbar as a dropdown matching the Scene Detail pattern: choose lenses, see scene count and time estimate, confirm. Progress indicator uses the same Firestore listener pattern from Phase 3: "Analyzing scene 12 of 47..." The writer can keep working while batch analysis runs in the background.

---

### Area 2: Analysis Results Presentation

**Q1.** Should there be a summary header above the methodology tabs, always visible?

**A1:** Summary header above the tabs, always visible. Health score (0-100 with color), tension level, and top 2-3 flags persist regardless of which methodology tab is active. The "at a glance" layer — writer opens Scene Detail, immediately sees "this scene is a 42 with passive protagonist and no stakes escalation" before diving into any specific lens. Without it, the writer clicks into Diagnosis every time just to check if a scene has problems.

**Q2.** Story Grid returns structured data. Should it display as labeled fields or narrative paragraph?

**A2:** Labeled fields. Writers using Story Grid are looking for specific structural elements — scan "Inciting Incident: [x], Turning Point: [y], Crisis: [z], Climax: [w], Resolution: [v]" and immediately see if one is missing or weak. A narrative paragraph buries information in prose. Labeled fields make missing Commandments obvious. Add value charge as a visual element: "Life → Death" with arrow and color shift. Below labeled fields, include 1-2 sentence AI commentary for context, but fields are primary.

**Q3.** Save the Cat tab — just beat identification or also placement assessment?

**A3:** Beat identification AND placement assessment. Identification alone ("This is the Catalyst") is trivia without placement context. The whole point of Save the Cat is structural placement. Show: beat name, expected page range, actual page, and simple indicator (on target / early / late). For scenes that don't map to any STC beat, show "No beat identified" — that's useful information too.

**Q4.** How should the Diagnosis tab present flags?

**A4:** Expandable cards. Colored tag chips are too compressed — a "Passive Protagonist" chip tells what's wrong but not why or what to do. Expandable cards with: title (flag name), 1-2 sentence explanation, and suggested action. Show collapsed by default so the list is scannable — writer sees flag titles as a stack, clicks to expand. Color-code left border by severity: red for structural problems, amber for weaknesses, blue for suggestions.

---

### Area 3: Re-analysis Triggers & Stale Data

**Q1.** When does existing analysis become "stale"?

**A1:** Stale when the editing session closes. Marking stale on every keystroke means analysis is perpetually stale while the writer works — useless. Session close is the natural boundary: writer opened the scene, made changes, navigated away. Compare content hash before and after — if it changed, mark analysis stale. Simple, automatic, doesn't flicker stale/fresh mid-edit.

**Q2.** Should stale analysis show a visual warning?

**A2:** Yes to warning in analysis results, no to card badge. Inside Scene Detail, show a clear banner above analysis tabs: "Scene edited since last analysis — results may be outdated. Re-analyze?" with a one-click re-analyze button. Don't put stale badges on Board/Timeline/Outline cards — visual noise across the entire board for something that only matters when actively reading analysis results.

**Q3.** For batch re-analysis, default to "only changed scenes" or "all scenes"?

**A3:** Default to "only changed scenes" with option for full re-run. Present as: "Re-analyze 5 changed scenes x 3 lenses = 15 calls (~2 min)" with secondary option: "Or re-analyze all 47 scenes." Changed-only is the prominent button, full re-run is secondary/text link.

**Q4.** If the writer reverts to a version that matches when analysis last ran, should analysis auto-restore freshness?

**A4:** Auto-restore freshness. If content hash after revert matches the content hash that was analyzed, the analysis is valid again. Marking it stale and forcing the writer to pay for an identical analysis is wasteful and feels broken. Compare hashes, match found, remove stale flag automatically. Store the content hash alongside each analysis result.

---

## Phase 9: Color Mode Switcher

### Area 1: Color Application Per View

**Q1.** In Health Mode, should the left border switch to health color (overriding sequence accents) or should a different element carry health color?

**A1:** Switch the left border to health color, don't add a second element. The left border is already established as the color-carrying element. When the writer switches to Health Mode, they're saying "show me health, not sequences." Clean swap, one element carrying one signal at a time.

**Q2.** On the Timeline, should bars switch entirely to mode color or keep sequence accents as a second visual channel?

**A2:** Bar fill switches entirely to mode color, drop the sequence accent. Two color channels on a single bar is too subtle — on a timeline with 50+ bars, nobody will parse a thin border color separately from the fill. The Timeline's purpose changes with the mode. Let the fill carry the active mode cleanly.

**Q3.** On the Outline, should the status dot switch to mode color or a different element?

**A3:** The dot switches to mode color. Same logic as Board left border. One element, one signal, mode-controlled. Don't add visual elements to the Outline row — it's a dense text-based view.

**Q4.** Should the color mode replace ALL view-specific color signals?

**A4:** AI flag badges and status badges remain constant regardless of mode. Flags are diagnostic warnings, statuses are workflow state — different categories that shouldn't disappear when modes switch. A "passive protagonist" red/amber badge shows whether in Health Mode, Beat Mode, or any other mode. The color mode controls the PRIMARY color signal (border, bar fill, dot), but secondary indicators (badges, flags) stay fixed.

---

### Area 2: Methodology Mode — 15-Beat Color Palette

**Q1.** Should the 15 STC beat colors be grouped by act structure or arbitrary but maximally distinct?

**A1:** Grouped by act structure. The whole point of Save the Cat is structural placement. Warm tones for Act 1 setup beats, cool blues for Act 2A, intense reds/oranges for Act 2B, greens for Act 3 finale. The color palette itself teaches the writer something — "too much warm, not enough cool — my Act 2A is thin." Arbitrary colors turn the Board into a rainbow communicating nothing.

**Q2.** Scenes with no STC beat identified — neutral gray or distinct "unassigned" color?

**A2:** Neutral gray. Unassigned scenes should recede, not compete. In Beat Mode, gray unassigned scenes become negative space that lets beat-colored scenes pop. If a writer has 30 gray scenes and 15 colored ones, that visual ratio itself tells a story about structural fat.

**Q3.** The dashed outline for "missing expected beats" — which scenes get this?

**A3:** Gap indicator between scenes, not a dashed outline on the nearest scene. Putting a dashed outline on the nearest scene implies "this scene SHOULD be the Catalyst but isn't" — a false accusation. A gap indicator (thin dashed divider or small placeholder card between scenes saying "Expected: Catalyst (~p.12)") communicates "a beat is missing in this region" without blaming any specific scene. Handles multiple missing beats cleanly.

**Q4.** How should the 15-beat color legend work?

**A4:** Floating panel the writer can toggle. Persistent sidebar eats permanent space. Hover tooltip disappears when you move your mouse. A floating panel opened with a "Legend" button in the mode toolbar stays open and the writer can position it while scanning scenes. Dismiss when they've internalized the colors. Compact: two columns, color swatch + beat name, grouped by act structure.

---

### Area 3: Mode Interactions & Empty States

**Q1.** Should modes with no data be available but gray, or disabled in the dropdown?

**A1:** Available but show gray with a hint. "Health Mode" is visible in the dropdown, every element renders gray with a subtle banner: "Run analysis to see health scores." Better than disabling because: disabled items with no explanation frustrate users, the visible-but-empty state acts as a call to action that teaches what analysis unlocks, and grayed-out items look like bugs. The hint also provides a natural place for an "Analyze All" shortcut button.

**Q2.** Should Sequence become a fifth official mode or the default state when no mode is active?

**A2:** Sequence is the default state when no mode is active. Don't make it a fifth mode — it's the baseline. The four modes (Health, Status, Methodology, Tension) are analytical overlays. Sequence coloring is "how the board looks normally." The mode dropdown shows "Color Mode: None" or no active selection when sequence colors are showing. Selecting any mode overrides it. Clicking the active mode again returns to sequence default.

**Q3.** Should color mode persist per project or globally?

**A3:** Per project. A freshly parsed project has no analysis data, so defaulting it to Health Mode globally would show a wall of gray. A fully analyzed project should remember what the writer was last looking at. Store the active color mode as a field on the project document in Firestore. Per-project means each project shows the view that makes sense for its current state.

**Q4.** Should mode transitions be instant or animated?

**A4:** Brief animation, 200ms color transition. Instant snapping feels jarring when 50+ elements change color simultaneously. A 200ms CSS transition gives the writer's eye a moment to track the change without feeling sluggish. Match the theme toggle timing from Phase 1. One-line CSS per element: `transition: background-color 200ms, border-color 200ms`.

---

## Phase 10: Notes & Task System

### Area 1: AI Flag to Note Conversion

**Q1.** Should every diagnostic flag auto-create a note, or only flags above a severity threshold?

**A1:** Only critical and important flags auto-create notes. Minor/polish flags stay display-only in the Diagnosis tab. If you auto-create for every flag across every scene, a 50-scene screenplay generates 150+ notes — instantly overwhelming. Critical ("no crisis question") and important ("passive protagonist") deserve task-list presence. Minor ("dialogue attribution could be tighter") is useful context in Diagnosis but doesn't warrant a task entry. Writer can manually promote any minor flag.

**Q2.** When AI auto-creates notes, who assigns category, priority, and complexity metadata?

**A2:** Claude assigns all three during analysis. The AI already understands severity from the analysis prompt — making the writer hand-triage 40+ notes defeats the purpose. Have Claude return category (structure/character/dialogue/pacing), priority (critical/important), and complexity (quick-fix/moderate/deep-work) as part of the structured response. Writer can override any of them, but defaults should be usable out of the box.

**Q3.** If re-analysis produces the same flag again, should it create a duplicate note, skip it, or update the existing note?

**A3:** Update the existing note with fresh analysis text. Duplicates bury the task list. Skipping silently means stale analysis text. Match on scene ID + flag type, replace analysis text with new version, keep writer's manual edits to priority/complexity/status intact. Add a subtle "Updated" timestamp.

**Q4.** Should the writer be able to dismiss an AI-generated note permanently?

**A4:** Yes — add a "dismissed" status that persists across re-analysis. Store dismissed flag types per scene. When re-analysis produces the same flag, check the dismissal list and don't recreate the note. This respects the writer's judgment — sometimes a low-tension scene is intentionally low-tension. Show dismissed flags in the Diagnosis tab with muted/struck-through style and "Undismiss" option, but keep them out of the task list.

---

### Area 2: Task List View Design

**Q1.** Card list or table rows?

**A1:** Card list. 40-80 notes handles fine with cards. Table rows optimize for density you don't need. Cards give room for: flag title, 1-line excerpt, scene reference, priority/complexity chips, and methodology source — all scannable without clicking into each item. If note count ever passes 100 (unlikely), revisit.

**Q2.** Default grouping: by scene, by priority, or flat list?

**A2:** Default grouping by scene. Writers think in scenes. "Scene 12 has 3 issues" is actionable — open Scene 12 and fix all three in context. "Critical: 8 notes across 8 different scenes" forces constant scene-hopping and context loss. Scene grouping also mirrors the Epps Pass Method where you work scene by scene. Let the writer toggle grouping to priority or category, but scene-first is default.

**Q3.** Filter UX: dropdown pills, preset buttons, or both?

**A3:** Preset buttons with custom filter option. Multi-dimensional filter bar with 6+ dropdown pills is power-user UI that will overwhelm writers. Give 3-4 presets covering 90% of use cases: "Critical Issues" (priority=critical), "Quick Fixes" (complexity=quick-fix), "My Notes" (source=manual), "Stale Notes" (scene edited since note created). Then "Custom Filter" for the full filter panel. Presets are opinionated shortcuts that reduce decision fatigue.

**Q4.** When a note's target scene has been edited since the note was created, should the note show an indicator?

**A4:** Show the indicator. A writer who fixed a passive protagonist problem shouldn't have to manually check whether the note still applies. Subtle text below the note card: "Scene edited since this note was created" with a "Re-analyze" shortcut and "Dismiss" option. This connects edit tracking to the task system and closes the feedback loop.

---

### Area 3: Auto-Status Update Logic

**Q1.** Phase 6 says "only one auto-transition." NOTE-07 says "marking notes done auto-updates scene status." These conflict. What wins?

**A1:** Suggest via toast, don't auto-change. Phase 6's principle was right — the writer controls status. Auto-changing assumes "notes resolved = scene is done," which isn't true. Toast: "All notes resolved on Scene 12 — mark as revised?" with a one-click action. If they ignore it, nothing changes. Helpful without being presumptuous.

**Q2.** What status should the suggestion propose?

**A2:** Always suggest "revised," never "approved." "Revised" means "I've addressed the known issues." "Approved" is a qualitative judgment only the writer can make after reading the scene holistically. Keep consistent: "All notes resolved — mark as revised?" Every time.

**Q3.** Should "dismissed" count the same as "done" for all-notes-resolved check?

**A3:** Yes, dismissed counts as resolved. A dismissed note means the writer consciously decided "this isn't an issue." That's a resolution. If a writer dismisses 3 and completes 2, all 5 are resolved and the toast fires. Making dismissed not count means the writer must mark intentionally-dismissed items as "done" to trigger the suggestion, which is semantically wrong.

**Q4.** Should notes on sequences or acts trigger status suggestions on scenes within them?

**A4:** Only scene-level notes affect scene status. A sequence-level note ("this sequence lacks escalation") is structural — resolving it doesn't mean any individual scene changed. Cascading higher-level note resolution to scene statuses creates false signals. Keep the trigger scoped: scene notes affect scene status. Sequence and act notes live in their own resolution space.

---

## Phase 12: Epps Rewriting Passes

### Area 1: Focus Notes — Source & Relationship to Task System

**Q1.** Should focus notes be pre-written templates, AI-personalized, or writer-authored?

**A1:** Template base + AI personalization. Start each pass type with 4-5 pre-written focus areas from Epps methodology (Foundation pass: protagonist goal, stakes, central conflict, ticking clock, etc.). Then layer 1-2 AI-personalized notes based on existing analysis data: "Your protagonist lacks agency in 12 scenes." Writer-authored blank form puts the burden on the writer to know what to look for — that's the tool's job. Templates give structure, AI makes it specific. Writer can edit or delete any of them.

**Q2.** Should focus notes become real note documents in the notes subcollection or stay as descriptive strings on the pass document?

**A2:** Stay as descriptive strings on the pass document, not note documents. Focus notes are guidance — "in this pass, look for these things." They're a checklist lens, not actionable tasks. Promoting them to full notes pollutes the Task List with meta-items. The noteIds field handles the connection to real task items. Focus notes and linked notes serve different purposes, keep them in different containers.

**Q3.** When the writer creates a pass, should existing notes auto-link based on category?

**A3:** Yes, auto-link based on category. Creating a Dialogue pass auto-populates noteIds with all open notes where category='dialogue'. This is the killer UX moment — writer creates a pass and immediately sees "you have 14 open dialogue issues across these scenes." Without auto-linking, the writer manually hunts through the Task List, which is tedious enough that nobody will do it. Auto-populate, then writer can unlink any that don't belong.

**Q4.** Can the writer add or remove notes from a pass after creation?

**A4:** Yes, full add and remove after creation. A pass is a living workspace, not a sealed contract. The writer will discover new issues while working — forcing them to finish the pass first breaks flow. Let them attach new notes (from Task List or by creating a new note from Scene Detail that auto-links to active pass). Let them unlink notes that turned out irrelevant. The pass's noteIds array is mutable until the writer marks it complete.

---

### Area 2: View Filtering — What's "Relevant" to a Pass?

**Q1.** When a pass is active, should Board/Timeline/Outline hide irrelevant scenes or dim them?

**A1:** Dim, don't hide. Same logic as Timeline act focus. Hiding scenes removes structural context. A writer doing a Dialogue pass still needs to see where dialogue-heavy scenes sit in overall flow. Dim irrelevant scenes to 40% opacity while directing attention to scenes with pass-relevant notes.

**Q2.** Should the Task List auto-filter to pass notes or show all with pass notes highlighted?

**A2:** Auto-filter to pass notes only. When a pass is active, the Task List becomes the pass's work list. Showing all notes with highlighting means scanning 60+ items. Auto-filter gives a clean focused list: "here are the 14 dialogue issues." Put a visible indicator: "Filtered to Dialogue Pass (14 notes)" with a "Show All Notes" toggle. The pass is a focused mode — let the UI commit.

**Q3.** How does the system know which categories map to which pass type?

**A3:** Hardcoded mapping. Each pass type has a clear domain per Epps methodology. Foundation = structure, stakes, plot. Character = character, arc. Dialogue = dialogue. Scene = pacing, tension. Relationships = character (relationship-tagged). Hardcode as a config object. The writer choosing categories at creation adds a step most writers won't understand. Bake the expertise in. If mapping needs adjusting, it's one config change.

**Q4.** While a pass is active, should a new manual note auto-link to the active pass?

**A4:** Prompt the writer with a smart default. Quick inline prompt when creating a note during active pass: "Add to Dialogue Pass?" with Yes/No, defaulted to Yes. Don't auto-link silently — the writer might spot a structural problem during a dialogue pass that belongs in a future Foundation pass. One extra click for accuracy. Silent auto-linking trains the writer not to create notes during passes for fear of polluting scope.

---

### Area 3: Pass Lifecycle & Ordering

**Q1.** Can the writer plan multiple passes upfront or create one at a time?

**A1:** Allow planning multiple passes upfront. A writer should be able to queue Foundation, Character, Dialogue, and Scene passes before starting any. This is how Epps actually works — assess the script, plan the pass strategy, then execute. The pass list becomes a rewrite roadmap. Each pass sits in "planned" status until activated. Also lets them see the full scope of work ahead.

**Q2.** Can only one pass be active at a time? Can they switch without completing?

**A2:** One active pass at a time, but switching is free. The point of a pass is focused attention on one dimension — running two simultaneously defeats the methodology. But let them deactivate the current pass (status returns to "planned," progress preserved) and activate a different one. No confirmation dialog. View filters, task list, and dimming all swap to the new pass. When they return, everything is where they left it.

**Q3.** Should the system enforce or recommend an order for the 11 pass types?

**A3:** Recommend, don't enforce. Show pass types in Epps's recommended order with a subtle note: "Epps recommends this sequence — Foundation before Character, Character before Dialogue." But let them create in any order. Some writers know their dialogue is weakest and want to hit that first. Enforcing order feels like the software is telling the writer how to write — fast way to get the tool abandoned.

**Q4.** When the writer completes a pass, what happens?

**A4:** Status flip + summary + snapshot. (1) Status flips to "completed" with timestamp. (2) Generate a brief summary: "Dialogue Pass completed: 14 notes linked, 11 resolved, 3 dismissed, 8 scenes edited" — stored on the pass document. (3) Snapshot the editedContent of every scene modified during the pass (content hashes referencing scene IDs at pass completion). The snapshot isn't full copies — it's content hashes that let you later answer "what did the script look like after the Dialogue pass?" by cross-referencing with the changelog. The summary gives a sense of accomplishment and a record to review before starting the next pass.

---

## Key Principles (Extracted)

These principles emerged across multiple decisions and should be treated as laws of the system:

1. **Scene Detail panel is a universal slide-out.** Click a scene anywhere in the app (Board, Timeline, Outline), Scene Detail opens. It overlays any view. It persists across view switches. Never break this pattern.

2. **One element carries one color signal.** Left border on Board cards, bar fill on Timeline, dot on Outline. The color mode controls the primary signal. Secondary indicators (flags, status badges) stay fixed regardless of mode.

3. **The writer controls status.** Only one auto-transition (first edit → in-progress). Everything else is manual. Suggestions via toast, never auto-changes.

4. **Breadcrumbs reflect what the current view supports.** No ghost breadcrumb segments that go nowhere. Store deeper zoom state internally for view switching, but the breadcrumb only shows navigable levels.

5. **Auto-save always, changelog by session.** 3-second debounce auto-save, one changelog entry per editing session (open → close).

6. **Single source of truth for scene headings.** One Firestore field, read everywhere. No display names, no local overrides.

7. **Dimming over hiding for context.** When filtering/focusing, dim irrelevant items to 40% rather than removing them. Structural context matters.

8. **Beats live inside scenes, never in the Outline tree.** Beats are sub-scene detail. They appear as highlights in the TipTap editor with a companion list, not as Outline tree leaf nodes or breadcrumb levels.

9. **Sequence colors are the default, not a mode.** The four color modes (Health, Status, Methodology, Tension) are analytical overlays. Sequence coloring is the baseline.

10. **Background processing, foreground feedback.** Parsing, batch analysis, and cascade deletes run in the background. The UI stays responsive with real-time Firestore listeners updating progress indicators.
