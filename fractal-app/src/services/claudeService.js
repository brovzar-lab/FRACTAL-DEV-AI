/**
 * Claude AI Service
 * Calls the Anthropic API via Firebase Cloud Function proxy
 * Falls back to mock responses for development
 *
 * Uses the direct Cloud Function URL (not Firebase Hosting rewrite)
 * because Hosting rewrites have a ~60s proxy timeout that kills
 * long-running screenplay analysis.
 */

const PROXY_URL = import.meta.env.VITE_CLAUDE_PROXY_URL || null
const USE_MOCK = !PROXY_URL

// ============================================================
// METHODOLOGY METADATA — used by generateFullSnapshot
// ============================================================
const METHODOLOGY_META = {
  'story-grid': { label: 'Story Grid',      description: 'Five Commandments at every level, genre obligatory scenes, value shifts' },
  'weiland':    { label: 'Weiland',         description: 'Character arc Ghost/Lie/Want/Need, arc percentage targets' },
  'save-cat':   { label: 'Save the Cat',    description: 'Blake Snyder 15 beat positions, B-story, fun and games' },
  'bmoc':       { label: 'BMOC',            description: 'Beginning/Middle/Obstacle/Climax at act and scene level' },
  'lyons':      { label: 'Lyons',           description: 'Moral Component, false belief, immoral effect, story vs situation test' },
}

// ============================================================
// PARSE SCREENPLAY → STRUCTURED JSON TREE
// ============================================================
export async function parseScreenplayWithClaude(rawText, pageCount, title = 'Untitled') {
  const textLimit = 200000  // 200K chars

  const prompt = `You are a professional screenplay analyst. Parse this screenplay into a structured JSON tree.

Return ONLY valid JSON with this exact shape:
{
  "title": "...",
  "pageCount": ${pageCount},
  "genre": "...",
  "acts": [
    {
      "id": "act-1",
      "label": "Act I — Setup",
      "pageRange": [1, 25],
      "diagnostics": { "status": "pass|warn|fail", "note": "..." },
      "sequences": [
        {
          "id": "seq-1-1",
          "label": "Seq 1: Description",
          "thematicFunction": "What this sequence does narratively",
          "scenes": [
            {
              "id": "sc-001",
              "heading": "INT/EXT. LOCATION - TIME",
              "pageRange": [1, 3],
              "synopsis": "1-2 sentence summary",
              "characters": ["NAME1","NAME2"],
              "diagnostics": {
                "status": "pass|warn|fail",
                "beatQuestion": "Binary yes/no dramatic question",
                "hasProtagonist": true,
                "bPresent": true,
                "mPresent": true,
                "oPresent": true,
                "cPresent": true,
                "valueShift": true,
                "notes": "Optional diagnostic note if warn or fail"
              },
              "text": "",
              "notes": [],
              "tasks": [],
              "beats": [],
              "edits": []
            }
          ]
        }
      ]
    }
  ]
}

Rules:
- Detect 3, 4, or 5 acts based on the screenplay's actual structure
- Group scenes into sequences of 3-8 scenes each around a narrative question
- CRITICAL: Include ALL acts, ALL sequences, ALL scenes from page 1 to page ${pageCount}. Do NOT stop early or truncate.
- For each scene, assess if Beginning (B), Middle (M), Obstacle (O), Climax (C) are present
- Identify the dramatic question (binary yes/no) for each scene
- For status: pass = all BMOC present + value shift, warn = 1-2 elements weak, fail = multiple missing
- IMPORTANT: Set "text" to "" (empty string) for EVERY scene. The text will be filled in automatically from the source.
- For genre, identify the primary Story Grid genre (Action-Adventure, Love Story, Crime, Horror, etc.)
- Scene IDs should be sequential: sc-001, sc-002, etc.
- Keep synopsis short (1-2 sentences max)

SCREENPLAY (${pageCount} pages):
${rawText.slice(0, textLimit)}`

  if (USE_MOCK) {
    await delay(2000)
    return getMockScreenplay(title, pageCount)
  }

  // 5-minute timeout for large screenplays
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 300000)

  try {
    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        message: prompt,
        model: 'claude-sonnet-4-20250514',
        max_tokens: 32000
      })
    })

    if (!response.ok) {
      const errBody = await response.text().catch(() => '')
      throw new Error(`API error: ${response.status}${errBody ? ' — ' + errBody.slice(0, 200) : ''}`)
    }

    const data = await response.json()
    let cleaned = data.content.replace(/```json\n?|\n?```/g, '').trim()

    // Attempt JSON repair if truncated (unfinished arrays/objects)
    let screenplay
    try {
      screenplay = JSON.parse(cleaned)
    } catch (parseErr) {
      console.warn('[Parse] JSON truncated, attempting repair…', parseErr.message)
      screenplay = repairTruncatedJSON(cleaned)
    }

    // Always backfill scene text from raw source
    backfillSceneText(screenplay, rawText)

    const totalScenes = screenplay.acts.reduce((n, a) => n + a.sequences.reduce((m, s) => m + s.scenes.length, 0), 0)
    console.log(`[Parse] Parsed "${screenplay.title}" — ${screenplay.acts.length} acts, ${totalScenes} scenes`)
    return screenplay
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Request timed out — screenplay may be too large. Try a shorter script.')
    throw e
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Attempt to repair truncated JSON from Claude.
 * Closes unclosed strings, arrays, and objects.
 */
function repairTruncatedJSON(str) {
  // Remove trailing incomplete key-value pairs
  str = str.replace(/,\s*"[^"]*"?\s*:?\s*$/, '')
  // Remove trailing incomplete strings
  str = str.replace(/,?\s*"[^"]*$/, '')

  // Count open/close brackets
  let opens = 0, closesNeeded = []
  for (const ch of str) {
    if (ch === '{') { opens++; closesNeeded.push('}') }
    else if (ch === '[') { opens++; closesNeeded.push(']') }
    else if (ch === '}' || ch === ']') { opens--; closesNeeded.pop() }
  }

  // Close any remaining open brackets
  while (closesNeeded.length > 0) {
    str += closesNeeded.pop()
  }

  try {
    return JSON.parse(str)
  } catch (e) {
    throw new Error(`Could not repair truncated JSON: ${e.message}. The screenplay may be too complex — try uploading as .fountain or .txt format.`)
  }
}

/**
 * Backfill scene text from raw screenplay text.
 * Matches scene headings to find full text between headings in the raw source.
 */
function backfillSceneText(screenplay, rawText) {
  // Remove page markers to get clean text
  const cleanText = rawText.replace(/--- PAGE \d+ ---\n?/g, '')
  const allScenes = screenplay.acts.flatMap(a => a.sequences.flatMap(s => s.scenes))

  // Find all scene heading positions in the raw text
  const headingPattern = /^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)\s*.+$/gim
  const headingPositions = []
  let match
  while ((match = headingPattern.exec(cleanText)) !== null) {
    headingPositions.push({ pos: match.index, heading: match[0].trim() })
  }

  // Match each parsed scene to its raw text block
  for (let i = 0; i < allScenes.length; i++) {
    const scene = allScenes[i]
    const sceneHeading = scene.heading.toUpperCase().trim()

    // Find the best matching heading in the raw text
    const matchIdx = headingPositions.findIndex(h =>
      h.heading.toUpperCase().includes(sceneHeading.slice(0, 30)) ||
      sceneHeading.includes(h.heading.toUpperCase().slice(0, 30))
    )

    if (matchIdx >= 0) {
      const start = headingPositions[matchIdx].pos
      const end = matchIdx + 1 < headingPositions.length
        ? headingPositions[matchIdx + 1].pos
        : cleanText.length
      scene.text = cleanText.slice(start, end).trim()
      // Remove matched heading so we don't double-match
      headingPositions.splice(matchIdx, 1)
    }
  }
}


// ============================================================
// ACT-LEVEL ANALYSIS
// ============================================================
export async function analyzeAct(act, lens, screenplay) {
  const cacheKey = `act-${act.id}-${lens}`

  const prompt = buildActPrompt(act, lens, screenplay)

  if (USE_MOCK) {
    await delay(1200)
    return getMockActAnalysis(act, lens)
  }

  return callClaude(prompt, 1500)
}

// ============================================================
// SEQUENCE-LEVEL ANALYSIS
// ============================================================
export async function analyzeSequence(sequence, act, lens) {
  const prompt = buildSequencePrompt(sequence, act, lens)

  if (USE_MOCK) {
    await delay(1000)
    return getMockSequenceAnalysis(sequence, lens)
  }

  return callClaude(prompt, 1200)
}

// ============================================================
// SCENE-LEVEL ANALYSIS (BMOC)
// ============================================================
export async function analyzeScene(scene, lens) {
  const prompt = buildScenePrompt(scene, lens)

  if (USE_MOCK) {
    await delay(1500)
    return getMockSceneAnalysis(scene, lens)
  }

  return callClaude(prompt, 2000)
}

// ============================================================
// BEAT-LEVEL ANALYSIS (BMOC Card)
// ============================================================
export async function analyzeBeat(scene, beatText, pos) {
  const prompt = buildBeatPrompt(scene, beatText, pos)

  if (USE_MOCK) {
    await delay(1000)
    return getMockBeatAnalysis(beatText, pos)
  }

  return callClaude(prompt, 1000)
}

// ============================================================
// REWRITE VARIANT
// ============================================================
export async function rewriteScene(scene, instruction) {
  const prompt = `You are a master screenwriter using BMOC scene engineering. Rewrite this scene based on the instruction.

INSTRUCTION: ${instruction}

ORIGINAL SCENE:
${scene.heading}
${scene.text}

SCENE DIAGNOSTICS:
- Dramatic Question: ${scene.diagnostics?.beatQuestion || 'Not identified'}
- Missing: ${getMissingBMOC(scene.diagnostics)}
- Value Shift: ${scene.diagnostics?.valueShift ? 'Present' : 'MISSING'}

Rewrite the scene. Keep the same characters and basic situation. Fix the identified structural issues.
Return ONLY the rewritten scene text in proper screenplay format. No explanation.`

  if (USE_MOCK) {
    await delay(2500)
    return `${scene.heading}\n\n[Rewritten variant would appear here with ${instruction}]\n\n${scene.text}`
  }

  return callClaude(prompt, 2000, true)
}

// ============================================================
// FULL-SCRIPT SNAPSHOT (dashboard AI Guide layer)
// ============================================================

/**
 * Serialize screenplay structure into a compact text outline for the prompt.
 * Deliberately omits full scene text to stay within token limits.
 */
function buildScriptOutline(screenplay) {
  const lines = []
  for (const act of screenplay.acts) {
    lines.push(`\nACT: ${act.label} (pp. ${act.pageRange.join('-')}) [${act.diagnostics.status}]`)
    for (const seq of act.sequences) {
      lines.push(`  SEQ: ${seq.label}`)
      for (const scene of seq.scenes) {
        const status = scene.diagnostics?.status || '?'
        lines.push(`    SCENE ${scene.id}: ${scene.heading} p.${scene.pageRange[0]}-${scene.pageRange[1]} [${status}] — ${scene.synopsis || ''}`)
      }
    }
  }
  return lines.join('\n')
}

/**
 * Generate a full-script snapshot analysis.
 * Analyzes the entire screenplay at once through the chosen methodology lens.
 * Returns a structured snapshot object for the dashboard.
 *
 * @param {object} screenplay - The full screenplay object with acts/sequences/scenes
 * @param {string} methodology - The chosen lens id (e.g. 'story-grid', 'weiland', etc.)
 * @returns {object} snapshot
 */
export async function generateFullSnapshot(screenplay, methodology) {
  const meta = METHODOLOGY_META[methodology]
  if (!meta) {
    console.warn(`[generateFullSnapshot] Unknown methodology "${methodology}", falling back to story-grid`)
  }
  const { label: methodologyLabel, description: methodologyDescription } = meta || METHODOLOGY_META['story-grid']

  const prompt = `You are a professional screenplay analyst. Analyze this entire screenplay and return a JSON structural snapshot.

SCREENPLAY: ${screenplay.title} (${screenplay.genre}, ${screenplay.pageCount} pages)
METHODOLOGY: ${methodologyLabel} — ${methodologyDescription}

STRUCTURE:
${buildScriptOutline(screenplay)}

Return ONLY valid JSON matching this schema:
{
  "categories": [
    { "id": "structure", "status": "pass|warn|fail", "summary": "...", "details": "..." },
    { "id": "character", "status": "pass|warn|fail", "summary": "...", "details": "..." },
    { "id": "premise",   "status": "pass|warn|fail", "summary": "...", "details": "..." },
    { "id": "pacing",    "status": "pass|warn|fail", "summary": "...", "details": "..." },
    { "id": "dialogue",  "status": "pass|warn|fail", "summary": "...", "details": "..." }
  ],
  "priorities": [
    { "rank": 1, "severity": "fail|warn|info", "title": "...", "detail": "...", "unitId": "...", "unitType": "scene|sequence|act" }
  ],
  "healthMap": [
    { "sequenceId": "...", "status": "pass|warn|fail" }
  ],
  "openingMessage": "..."
}

Rules:
- priorities: rank the top 5-10 structural problems by severity
- healthMap: one entry per sequence using its actual id
- openingMessage: Director mode — name the #1 problem, offer fix options, under 60 words
- Analyze against the ${methodologyLabel} framework specifically`

  if (USE_MOCK) {
    await delay(2000)
    return {
      categories: [
        { id: 'structure', status: 'fail', summary: 'Midpoint (p.54) has no value reversal. Act II runs 15 pages over genre target.', details: 'The Story Grid requires a value shift at the midpoint — a moment where the protagonist\'s fortunes reverse. Scene 23 (p.54) reaches its climax beat without delivering this shift, leaving the second half of Act II without structural momentum.' },
        { id: 'character', status: 'warn', summary: 'Protagonist want ≠ need through Seq 4–5. Arc resolves late.', details: 'The protagonist\'s external want (solve the case) and internal need (accept vulnerability) run in parallel without converging until Act III. The gap should begin closing at the midpoint.' },
        { id: 'premise',   status: 'pass', summary: 'Strong. Clear stakes, genre promise met, inciting incident lands at p.12.', details: 'The logline is well-constructed and the genre contract (Drama: Life/Death values) is honored. The inciting incident arrives within Story Grid parameters.' },
        { id: 'pacing',    status: 'fail', summary: 'Seq 4–6 average 3.2 scenes — below genre target of 5.', details: 'Act II runs long and the mid-act sequences are underscened. Each sequence should contain 4-6 scenes to maintain dramatic momentum. Consider adding or splitting scenes in Seq 4 and 5.' },
        { id: 'dialogue',  status: 'warn', summary: '3 supporting characters have indistinct voice. Exposition heavy in Sc. 4, 7, 12.', details: 'Scenes 4, 7, and 12 carry expository dialogue that should be converted to subtext or dramatized differently. Three supporting characters (the partner, the captain, and the informant) are currently voice-indistinct.' },
      ],
      priorities: [
        { rank: 1, severity: 'fail', title: 'Midpoint reversal missing', detail: 'Scene 23 · p.54 · Five Commandments: Climax beat has no value reversal', unitId: 'sc-023', unitType: 'scene' },
        { rank: 2, severity: 'fail', title: 'Act II 15 pages over genre target', detail: 'Sequences 4–6 are underscened — compress or cut to tighten Act II', unitId: 'act-2', unitType: 'act' },
        { rank: 3, severity: 'warn', title: 'Protagonist arc: want/need gap', detail: 'Gap between want (external) and need (internal) should begin closing at midpoint', unitId: 'seq-1-4', unitType: 'sequence' },
        { rank: 4, severity: 'warn', title: '3 supporting characters: voice differentiation needed', detail: 'Partner, captain, informant are currently voice-indistinct in dialogue', unitId: 'sc-004', unitType: 'scene' },
        { rank: 5, severity: 'info', title: 'Exposition in Sc. 4, 7, 12', detail: 'Subtext rewrites recommended — dialogue carries information that should be dramatized', unitId: 'sc-004', unitType: 'scene' },
      ],
      healthMap: screenplay.acts.flatMap(a => a.sequences.map(s => ({
        sequenceId: s.id,
        status: s.scenes.every(sc => sc.diagnostics?.status === 'pass') ? 'pass'
              : s.scenes.some(sc => sc.diagnostics?.status === 'fail') ? 'fail'
              : 'warn'
      }))),
      openingMessage: `Analysis complete. Biggest structural problem: no value reversal at the midpoint (p.54). Fix this first — the Act II pacing issues downstream will likely self-correct. Want the options?`
    }
  }

  const rawText = await callClaude(prompt, 4000, true, 120000)
  let snapshot
  try {
    const cleaned = rawText.replace(/```json\n?|\n?```/g, '').trim()
    snapshot = JSON.parse(cleaned)
  } catch {
    snapshot = repairTruncatedJSON(rawText.replace(/```json\n?|\n?```/g, '').trim())
  }
  return snapshot
}

// ============================================================
// GUIDE CHAT
// ============================================================

/**
 * Send a message to the AI Guide and get a response.
 *
 * @param {string} message - The user's message
 * @param {object} context - Current navigation context
 *   { unitId: string|null, unitType: 'scene'|'sequence'|'act'|'full-script', unitData: object|null }
 * @param {'director'|'coach'|'fast'} mode - Guide interaction mode
 * @param {Array} thread - Recent conversation history (last 6 messages max)
 *   Each: { role: 'user'|'ai', content: string }
 * @param {object} screenplay - The screenplay object (for context building)
 * @returns {{ content: string, cardType: string|null, cardData: object|null }}
 */
export async function chatWithGuide(message, context, mode, thread, screenplay) {
  const prompt = buildGuidePrompt(message, context, mode, thread, screenplay)

  if (USE_MOCK) {
    await delay(800)
    const mockResponses = {
      director: `No value reversal at the midpoint (Scene 23, p.54). The Climax beat arrives but the protagonist's situation doesn't shift. Three options:\n\nA) Add a revelation scene at p.54-55 that reverses their advantage\nB) Rewrite the Sc.23 climax: protagonist wins, then immediately loses\nC) Pull Scene 26 forward — it already has a strong reversal built in\n\nWhich direction?`,
      coach: `Story Grid requires every scene to end with a value shift at the Climax beat — the protagonist's situation must move from positive to negative or vice versa. Scene 23 (p.54) has all four BMOC elements but the Climax doesn't deliver a reversal, leaving Act II without structural momentum.\n\nThree options:\n\nA) Add a revelation scene at p.54-55 that reverses their advantage\nB) Rewrite the Sc.23 climax: protagonist wins, then immediately loses\nC) Pull Scene 26 forward — it already has a strong reversal\n\nWhich works best for your character's arc?`,
      fast: `INT. DETECTIVE BUREAU - NIGHT\n\nMARCO reviews the evidence board. He spots the connection — CARTER's signature on the transfer order. He reaches for the phone.\n\nThen stops.\n\nHis own name is on the bottom of the page.\n\nHe sets the phone down slowly.\n\n                    MARCO\n          I was there.\n\nThe realization hits him like a physical blow. He was part of it. He closes the folder.\n\nHe walks to the window. The city below, indifferent.`
    }
    return { content: mockResponses[mode] || mockResponses.director, cardType: null, cardData: null }
  }

  const raw = await callClaude(prompt, 1500, true, 30000)
  return { content: raw.trim(), cardType: null, cardData: null }
}

function buildGuidePrompt(message, context, mode, thread, screenplay) {
  const modeInstructions = {
    director: `You are the AI Guide for a professional screenwriter using the ${screenplay?.methodology || 'story-grid'} methodology. Be direct and efficient. Give specific options (A/B/C) with tradeoffs. No methodology explanations unless asked. Reference specific scenes, pages, and beats from the script.`,
    coach: `You are the AI Guide and screenwriting coach for a writer using the ${screenplay?.methodology || 'story-grid'} methodology. Before giving options, briefly explain the relevant principle from the methodology (1-2 sentences). Then give specific options (A/B/C). Reference specific scenes, pages, and beats.`,
    fast: `You are the AI Guide. The writer wants a fast rewrite. Generate a rewritten version of the scene immediately with minimal framing. Respond with ONLY the rewritten scene text in proper screenplay format.`
  }

  const contextBlock = buildContextBlock(context, screenplay)
  const historyBlock = thread.slice(-6).map(m => `${m.role === 'user' ? 'Writer' : 'Guide'}: ${m.content}`).join('\n')

  return `${modeInstructions[mode] || modeInstructions.director}

SCREENPLAY: ${screenplay?.title || 'Untitled'} (${screenplay?.genre || 'Unknown'}, ${screenplay?.pageCount || '?'} pages)
METHODOLOGY: ${screenplay?.methodology || 'story-grid'}

CURRENT CONTEXT:
${contextBlock}

${historyBlock ? `CONVERSATION SO FAR:\n${historyBlock}\n` : ''}
Writer: ${message}
Guide:`
}

function buildContextBlock(context) {
  if (!context?.unitId || !context?.unitType) {
    return 'Viewing: Full script overview'
  }

  if (context.unitType === 'scene' && context.unitData) {
    const scene = context.unitData
    return `Viewing Scene: ${scene.heading} (p.${scene.pageRange?.[0]}-${scene.pageRange?.[1]})
Synopsis: ${scene.synopsis || 'No synopsis'}
Diagnostic status: ${scene.diagnostics?.status || 'unknown'}
Characters: ${scene.characters?.join(', ') || 'unknown'}`
  }

  if (context.unitType === 'sequence' && context.unitData) {
    const seq = context.unitData
    return `Viewing Sequence: ${seq.label}
Thematic function: ${seq.thematicFunction || 'unknown'}
Scene count: ${seq.scenes?.length || 0}`
  }

  if (context.unitType === 'act' && context.unitData) {
    const act = context.unitData
    return `Viewing Act: ${act.label} (pp.${act.pageRange?.join('-')})
Diagnostic: ${act.diagnostics?.status || 'unknown'} — ${act.diagnostics?.note || ''}`
  }

  if (context.unitType === 'full-script') {
    return 'Viewing: Full script overview'
  }

  return `Viewing: ${context.unitType} (${context.unitId})`
}

// ============================================================
// PROMPT BUILDERS
// ============================================================

function buildActPrompt(act, lens, screenplay) {
  const lensInstructions = {
    'story-grid': `Apply the Story Grid framework. Assess the Five Commandments (Inciting Incident, Progressive Complication, Crisis, Climax, Resolution). Identify missing obligatory scenes for the genre "${screenplay.genre}".`,
    'weiland': `Apply K.M. Weiland's structure. Identify the expected page percentage for this act's key beats. Assess whether the protagonist's arc (Ghost → Lie → Want → Need) is progressing correctly.`,
    'save-cat': `Apply Save the Cat beats. Identify which Blake Snyder beats should appear in this act and whether they're present, missing, or misplaced.`,
    'bmoc': `Apply BMOC macro-structure. Assess the Beginning, Escalating Middle, Obstacle, and Climax of this act. Where does the act-level dramatic question get asked and answered?`,
    'lyons': `Apply Jeff Lyons' Rapid Story Development. Identify the Moral Component at stake in this act. What is the protagonist falsely believing, and what's the immoral effect on others?`
  }

  return `You are analyzing a screenplay act. Return a JSON object with this shape:
{
  "lens": "${lens}",
  "summary": "2-3 sentence overview of this act",
  "arcPosition": "Where is the protagonist in their internal arc?",
  "structuralScore": 1-10,
  "keyStrengths": ["strength 1", "strength 2"],
  "criticalIssues": ["issue 1", "issue 2"],
  "recommendations": ["specific fix 1", "specific fix 2"],
  "obligatoryCheck": { "present": [".."], "missing": [".."], "misplaced": [".."] },
  "nextSteps": "What the writer should focus on first"
}

${lensInstructions[lens] || lensInstructions['story-grid']}

ACT: ${act.label}
PAGES: ${act.pageRange.join('-')}
DIAGNOSTIC STATUS: ${act.diagnostics.status} — ${act.diagnostics.note}

SCENES IN THIS ACT:
${act.sequences.flatMap(s => s.scenes).map(sc => `- ${sc.heading} (p.${sc.pageRange[0]}-${sc.pageRange[1]}): ${sc.synopsis}`).join('\n')}`
}

function buildSequencePrompt(seq, act, lens) {
  return `Analyze this screenplay sequence. Return JSON:
{
  "sequenceQuestion": "The binary dramatic question this sequence asks",
  "answer": "pass|fail — how the question resolves (or 'unresolved' if unclear)",
  "thematicFunction": "What this sequence does in the narrative architecture",
  "pacing": { "assessment": "tight|good|loose", "note": "..." },
  "characterPressure": "How does this sequence press the protagonist's wound?",
  "recommendation": "Most important thing to fix",
  "sceneNotes": [{ "sceneId": "...", "note": "..." }]
}

SEQUENCE: ${seq.label}
PARENT ACT: ${act.label}
THEMATIC FUNCTION: ${seq.thematicFunction}
LENS: ${lens}

SCENES:
${seq.scenes.map(sc => `${sc.heading} (p.${sc.pageRange.join('-')}): ${sc.synopsis}`).join('\n')}`
}

function buildScenePrompt(scene, lens) {
  return `You are a screenplay analyst using BMOC scene engineering. Analyze this scene.

Return JSON:
{
  "dramaticQuestion": "The binary yes/no question that drives this scene",
  "protagonistOfScene": "Who is the scene's protagonist (may differ from story protagonist)",
  "antagonistOrOpposition": "What/who opposes them",
  "stakeIfLose": "What the protagonist stands to lose",
  "bmoc": {
    "beginning": { "present": true/false, "text": "What establishes the scene", "note": "" },
    "middle": { "present": true/false, "text": "The complication/escalation", "note": "" },
    "obstacle": { "present": true/false, "text": "What blocks the protagonist", "note": "" },
    "climax": { "present": true/false, "text": "How the scene resolves", "note": "" }
  },
  "valueAtStake": "What life value is in play (love/isolation, life/death, etc.)",
  "valueShift": true/false,
  "valueShiftNote": "From X to Y — or 'No shift, scene ends in same value position'",
  "allIsLost": { "present": true/false, "note": "Is there a moment of genuine loss or reversal?" },
  "lensNotes": "Lens-specific observation",
  "topFix": "The single most important structural change to make",
  "rewritePrompt": "A suggested instruction for rewriting this scene"
}

LENS: ${lens}
SCENE: ${scene.heading}
TEXT:
${scene.text}`
}

function buildBeatPrompt(scene, beatText, position) {
  return `Analyze this screenplay beat (structural unit within a scene).

Return JSON:
{
  "beatType": "B|M|O|C",
  "dramaticQuestion": "Binary question this beat asks",
  "protagonistWant": "What they want in this specific moment",
  "opposition": "What opposes them",
  "tactic": "What tactic does the protagonist use?",
  "valueShift": "How does the value state change across this beat?",
  "wound": "Does this beat press the protagonist's core wound? How?",
  "rewriteSuggestion": "One specific improvement to this beat"
}

BEAT TEXT:
${beatText}

POSITION IN SCENE: ${position}
SCENE: ${scene.heading}`
}

// ============================================================
// HTTP CALLER
// ============================================================
async function callClaude(prompt, maxTokens = 1500, rawText = false, timeout = 30000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({ message: prompt, model: 'claude-sonnet-4-20250514', max_tokens: maxTokens })
    })
    if (!response.ok) throw new Error(`Claude API error: ${response.status}`)
    const data = await response.json()
    if (rawText) return data.content
    return JSON.parse(data.content.replace(/```json\n?|\n?```/g, '').trim())
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Request timed out.')
    throw e
  } finally {
    clearTimeout(timer)
  }
}

// ============================================================
// MOCK DATA
// ============================================================
function getMockActAnalysis(act, lens) {
  const base = {
    lens,
    structuralScore: 7,
  }

  const lensData = {
    'story-grid': {
      summary: `${act.label} delivers a functional inciting incident, but the Progressive Complication lacks force. The Five Commandments are partially met — Crisis and Climax land, but the Resolution feels rushed.`,
      arcPosition: 'Value charge: Life → Unconsciousness. The global value is shifting but hasn\'t committed fully.',
      keyStrengths: ['Inciting Incident arrives at the correct beat position', 'Genre conventions for Drama are mostly honored'],
      criticalIssues: ['Progressive Complication is underpowered — needs a genuine reversal, not just bad news', 'No clear Obligatory Scene: "Hero at the Mercy of the Villain"'],
      recommendations: ['Add a scene where the antagonist directly confronts the protagonist\'s weakness', 'Move the Crisis earlier — it currently lands too close to the Climax'],
      obligatoryCheck: {
        present: ['Inciting Incident', 'Crisis', 'Climax'],
        missing: ['Hero at the Mercy of the Villain', 'Proof of Love'],
        misplaced: ['Resolution (rushed — needs 1-2 more pages)']
      },
      nextSteps: 'Focus on the missing Obligatory Scene. The audience expects a "Hero at the Mercy of the Villain" moment — without it, the climax feels unearned.',
      lensLabel: 'Story Grid',
    },
    'weiland': {
      summary: `${act.label} introduces the Ghost effectively but the Lie hasn't been articulated clearly enough. The protagonist's Want is active but the Need is invisible — the audience can't track the internal arc yet.`,
      arcPosition: 'Character is operating from the Lie — unconscious of the false belief. The Ghost surfaces in Scene 1 but isn\'t pressed again until too late.',
      keyStrengths: ['Ghost established early with a specific memory/event', 'Want is concrete, active, and scene-drivable'],
      criticalIssues: ['The Lie needs to be demonstrated through behavior, not just stated', 'Need (Truth) hasn\'t been planted — no character holds the counter-argument yet'],
      recommendations: ['Add a scene where the protagonist\'s Lie causes visible harm to someone they care about', 'Introduce a Truth-holder character who represents what the protagonist can\'t yet see'],
      obligatoryCheck: {
        present: ['Ghost/Wound', 'Want (external goal)', 'Characteristic Moment'],
        missing: ['Thing the Character Needs (Truth)', 'Normal World contrast to Adventure World'],
        misplaced: ['Lie articulation — should be demonstrated by page 10, currently page 18']
      },
      nextSteps: 'The protagonist needs a "Lie in action" scene — show us the false belief causing real damage. That\'s what makes the audience root for change.',
      lensLabel: 'Weiland Arc',
    },
    'save-cat': {
      summary: `${act.label} hits the Opening Image and Setup beats but the Catalyst arrives late. The Theme Stated moment is present but buried — it needs to be more pointed.`,
      arcPosition: 'Setup → Catalyst territory. The protagonist is still in the "old world" but the disruption is arriving.',
      keyStrengths: ['Opening Image clearly establishes the protagonist\'s starting state', 'The Setup efficiently introduces stakes and key relationships'],
      criticalIssues: ['Catalyst arrives 4 pages late (should be closer to page 12 in a 110-page script)', 'Debate section is too short — protagonist decides too quickly'],
      recommendations: ['Move the Catalyst event earlier — the audience is waiting too long for disruption', 'Extend the Debate: add a scene where the protagonist tries to avoid the call to adventure'],
      obligatoryCheck: {
        present: ['Opening Image', 'Setup', 'Theme Stated'],
        missing: ['Debate (underdeveloped)'],
        misplaced: ['Catalyst (4 pages late)']
      },
      nextSteps: 'Fix the Catalyst timing. In Save the Cat structure, the inciting event needs to land by page 12. Every page of delay costs audience engagement.',
      lensLabel: 'Save the Cat',
    },
    'bmoc': {
      summary: `${act.label} has a clear Beginning and reaches its Climax, but the Middle and Obstacle phases are compressed. The act-level dramatic question is present but the opposition isn't specific enough.`,
      arcPosition: 'Act opens with a clear dramatic question. The B/M/O/C macro-structure is present but M and O need more room.',
      keyStrengths: ['Act-level Beginning establishes clear dramatic question', 'Climax delivers a genuine value shift'],
      criticalIssues: ['Middle section is compressed — complications arrive too fast without breathing room', 'Obstacle lacks a specific, personified antagonist — the opposition is circumstances, not a character'],
      recommendations: ['Expand the Middle by 2-3 scenes — let complications escalate gradually', 'Give the Obstacle a face: who specifically blocks the protagonist? Make it personal.'],
      obligatoryCheck: {
        present: ['Beginning (dramatic question)', 'Climax (value shift)'],
        missing: ['Personified Obstacle'],
        misplaced: ['Middle (compressed into 2 scenes — needs 4-5)']
      },
      nextSteps: 'The Middle is doing too much too fast. Spread the escalation across more scenes so each complication can land and breathe.',
      lensLabel: 'BMOC',
    },
    'lyons': {
      summary: `${act.label} establishes the premise but the Moral Component is unclear. The protagonist's false belief exists but isn't producing visible immoral effects — the story reads as Situation, not Story.`,
      arcPosition: 'Protagonist is operating from a moral blind spot. The false belief is present but its consequences are internal only — not yet shown to harm others.',
      keyStrengths: ['Premise is clear and dramatic', 'The protagonist has a specific false belief that could drive deep transformation'],
      criticalIssues: ['Moral Component not demonstrated — we don\'t see the false belief hurting anyone', 'Narrative Engine may not be engaged: is this Story or Situation?'],
      recommendations: ['Add a scene showing the immoral effect — the protagonist\'s blind spot causing real harm to another character', 'Test: if you remove the protagonist and replace them with anyone else, does the story still work? If yes, it\'s Situation, not Story.'],
      obligatoryCheck: {
        present: ['Premise', 'False Belief'],
        missing: ['Immoral Effect (visible consequence)', 'Narrative Engine engagement'],
        misplaced: ['Moral blind spot — currently stated, needs to be dramatized']
      },
      nextSteps: 'The story vs. situation test is critical. The protagonist\'s specific moral blind spot must be the engine. Show us the harm — make the audience feel complicit.',
      lensLabel: 'Lyons',
    },
  }

  return { ...base, ...(lensData[lens] || lensData['story-grid']) }
}

function getMockSequenceAnalysis(seq, lens) {
  const lensVariants = {
    'story-grid': {
      sequenceQuestion: 'Does this sequence deliver its genre obligation — the scene the audience came to see?',
      answer: 'warn',
      characterPressure: 'The global value (Life/Death for Action, Love/Hate for Love Story) must shift within this sequence.',
      recommendation: 'Identify this sequence\'s obligatory scene and make sure it delivers. The audience\'s implicit genre contract must be honored.',
    },
    'weiland': {
      sequenceQuestion: 'Does the protagonist\'s Lie get reinforced or challenged in this sequence?',
      answer: 'fail',
      characterPressure: 'The Ghost should surface here — a memory, a flashback trigger, or a situation that mirrors the original wound.',
      recommendation: 'Add a "Lie in action" moment: the protagonist makes a choice based on their false belief and it costs someone.',
    },
    'save-cat': {
      sequenceQuestion: 'Does this sequence correspond to the correct Blake Snyder beat for its page position?',
      answer: 'pass',
      characterPressure: 'The B-Story (usually a love interest or mentor) should be developing in parallel here.',
      recommendation: 'Check the B-Story thread — is the "love story" (thematic carrier) present in this section?',
    },
    'bmoc': {
      sequenceQuestion: 'Will the protagonist find a way to break through their isolation?',
      answer: 'fail',
      characterPressure: 'Every scene in this sequence should press the protagonist\'s core wound directly.',
      recommendation: 'The sequence question resolves too cleanly. Add a cost to the "win" so progress requires sacrifice.',
    },
    'lyons': {
      sequenceQuestion: 'Does this sequence advance the Moral Component — does the protagonist\'s blind spot deepen or begin to crack?',
      answer: 'warn',
      characterPressure: 'The Pinch-Crunch: the protagonist should face increasing pressure to confront their moral flaw.',
      recommendation: 'Test: is this sequence driven by the protagonist\'s specific moral blind spot, or could any character be substituted?',
    },
  }

  const v = lensVariants[lens] || lensVariants['bmoc']

  return {
    sequenceQuestion: v.sequenceQuestion,
    answer: v.answer,
    thematicFunction: seq.thematicFunction || 'Forces the protagonist to confront the inadequacy of their current approach',
    pacing: { assessment: 'good', note: 'Scene distribution is appropriate. Consider trimming Scene 2 by 1 page.' },
    characterPressure: v.characterPressure,
    recommendation: v.recommendation,
    lensLabel: lens,
    sceneNotes: seq.scenes.map((sc, i) => ({ sceneId: sc.id, note: i === 0 ? 'Strong opening — drops us into conflict immediately.' : 'Consider deepening this scene\'s methodology-specific element.' }))
  }
}

function getMockSceneAnalysis(scene, lens) {
  const d = scene.diagnostics || {}
  
  // Base BMOC analysis (shared across all lenses)
  const bmoc = {
    beginning: { present: d.bPresent ?? true, text: 'The scene opens with the protagonist already in motion', note: '' },
    middle: { present: d.mPresent ?? true, text: 'First complication — the simple approach fails', note: d.mPresent === false ? 'Missing — scene jumps from Beginning to Obstacle without escalation' : '' },
    obstacle: { present: d.oPresent ?? true, text: 'The protagonist\'s plan collides with direct opposition', note: '' },
    climax: { present: d.cPresent ?? true, text: 'A decision is made — win or loss depending on character', note: d.cPresent === false ? 'Missing — scene ends without resolution, leaving no value shift' : '' }
  }

  // Lens-specific fields
  const lensSpecific = {
    'story-grid': {
      lensNotes: 'STORY GRID: Checking the Five Commandments at scene level.',
      fiveCommandments: {
        incitingIncident: { present: d.bPresent ?? true, note: 'The scene\'s inciting incident lands clearly.' },
        progressiveComplication: { present: d.mPresent ?? true, note: d.mPresent === false ? 'No progressive complication — get to a turning point.' : 'Complication escalates appropriately.' },
        crisis: { present: d.oPresent ?? true, note: 'Best bad choice or irreconcilable goods.' },
        climax: { present: d.cPresent ?? true, note: 'Character makes a decision under pressure.' },
        resolution: { present: d.valueShift ?? true, note: d.valueShift ? 'Clear value shift.' : 'No resolution — scene floats.' },
      },
      genreNote: 'Check: does this scene serve the genre\'s core value? Drama = Life/Death (internal).',
      topFix: 'Identify which of the Five Commandments is weakest and strengthen that single element.',
      rewritePrompt: 'Rewrite focusing on a stronger Progressive Complication — the turning point should genuinely surprise.',
    },
    'weiland': {
      lensNotes: 'WEILAND: Tracking the character arc through this scene.',
      arcTracking: {
        lieReinforced: true,
        ghostSurfaced: false,
        wantPursued: true,
        needGlimpsed: false,
        truthEncountered: false,
      },
      arcNote: 'The protagonist is still operating from the Lie. The Ghost hasn\'t surfaced in this scene — consider adding a trigger.',
      percentagePosition: `This scene sits at ~${Math.round((scene.pageRange[0] / 110) * 100)}% — ${scene.pageRange[0] < 30 ? 'Setup territory (Lie reinforcement expected)' : scene.pageRange[0] < 65 ? 'First Half of Act II (escalating consequences of Lie)' : 'Second Half (Truth must begin breaking through)'}`,
      topFix: 'Add a moment where the Ghost surfaces — a memory, a physical reaction, something that connects to the original wound.',
      rewritePrompt: 'Rewrite so the protagonist\'s Lie causes visible harm to someone in this scene. Show the cost.',
    },
    'save-cat': {
      lensNotes: 'SAVE THE CAT: Mapping to Blake Snyder beat sheet.',
      beatSheetPosition: scene.pageRange[0] < 12 ? 'Opening Image / Setup' : scene.pageRange[0] < 15 ? 'Theme Stated' : scene.pageRange[0] < 25 ? 'Catalyst / Debate' : scene.pageRange[0] < 55 ? 'Fun & Games / B-Story' : scene.pageRange[0] < 65 ? 'Midpoint' : scene.pageRange[0] < 75 ? 'Bad Guys Close In' : scene.pageRange[0] < 85 ? 'All Is Lost' : 'Finale',
      expectedBeat: scene.pageRange[0] < 25 ? 'This scene should establish the "before" snapshot or present the disruption.' : 'This scene should deliver on the genre promise — the "fun and games" the audience came for.',
      bStoryPresent: false,
      bStoryNote: 'The B-Story (thematic mirror) should be developing somewhere in this act. Is there a mentor or love interest?',
      topFix: 'Verify this scene matches its expected beat sheet position. If it\'s in Fun & Games territory, it must deliver the promise of the premise.',
      rewritePrompt: 'Rewrite to deliver a clearer "promise of the premise" — the audience needs to feel they\'re getting what the trailer promised.',
    },
    'bmoc': {
      lensNotes: 'BMOC: Engineering the scene\'s four structural beats.',
      beatQuestion: d.beatQuestion || 'Will the protagonist achieve their immediate goal?',
      antagonistLeverage: 'The opposition needs specific leverage over the protagonist — not just blocking power, but knowledge of vulnerability.',
      suspenseTools: {
        tickingClock: false,
        dramaticIrony: false,
        goodNewsBadNews: true,
        surprise: false,
      },
      topFix: d.cPresent === false ? 'Add a Climax beat — the scene needs a moment of decision or consequence.' : 'Add a ticking clock — urgency transforms competent scenes into compelling ones.',
      rewritePrompt: 'Rewrite with a stronger Obstacle — the antagonist should attack the protagonist\'s specific vulnerability.',
    },
    'lyons': {
      lensNotes: 'LYONS: Testing the Moral Component at scene level.',
      moralComponent: {
        falseBeliefActive: true,
        immoralEffectVisible: false,
        consequence: 'The protagonist\'s blind spot hasn\'t produced visible harm in this scene.',
      },
      narrativeEngine: 'Is the protagonist\'s specific moral flaw driving this scene? Or could any character be in this situation?',
      storyVsSituation: scene.pageRange[0] > 30 ? 'At this point in the script, every scene must be driven by the protagonist\'s unique blind spot. Generic conflict = Situation, not Story.' : 'Early setup — establishing the blind spot is appropriate here.',
      topFix: 'Show the immoral effect. The protagonist\'s false belief must cause harm visible to the audience — that\'s what creates the rooting interest for change.',
      rewritePrompt: 'Rewrite so the protagonist\'s moral blind spot directly causes the scene\'s central conflict. Make the flaw the engine.',
    },
  }

  const ls = lensSpecific[lens] || lensSpecific['bmoc']

  return {
    dramaticQuestion: d.beatQuestion || 'Will the protagonist achieve their immediate goal?',
    protagonistOfScene: scene.characters?.[0] || 'Protagonist',
    antagonistOrOpposition: 'Internal resistance + external circumstance',
    stakeIfLose: 'Confirmation of their deepest fear about themselves',
    bmoc,
    valueAtStake: 'Connection / Isolation',
    valueShift: d.valueShift ?? true,
    valueShiftNote: d.valueShift ? 'From hope of connection → failure of connection (negative shift)' : 'No shift — scene ends in same value position.',
    allIsLost: { present: false, note: 'No moment of genuine reversal.' },
    lensLabel: lens,
    ...ls,
  }
}

function getMockBeatAnalysis(text, pos) {
  return {
    beatType: ['B','M','O','C'][Math.floor(pos * 4)],
    dramaticQuestion: 'Will the character get what they need in this moment?',
    protagonistWant: 'To be seen, acknowledged, or to break through',
    opposition: 'Silence, absence, or indifference',
    tactic: 'Persistence — repeating the same approach with increasing desperation',
    valueShift: 'From hope → doubt',
    wound: 'This beat directly presses the protagonist\'s core wound — the fear that they are invisible.',
    rewriteSuggestion: 'Give the protagonist a different tactic in this beat. Persistence isn\'t working — what would desperation look like for this specific character?'
  }
}

function getMockScreenplay(title, pageCount) {
  return {
    id: `sp-${Date.now()}`,
    title,
    pageCount,
    genre: 'Drama',
    parsed: true,
    uploadedAt: new Date().toISOString(),
    acts: [
      {
        id: 'act-1', label: 'Act I — Setup', pageRange: [1, Math.floor(pageCount * 0.25)],
        diagnostics: { status: 'pass', note: 'Strong inciting incident. Act established correctly.' },
        sequences: [{
          id: 'seq-1-1', label: 'Seq 1: Ordinary World', thematicFunction: 'Establish protagonist and false belief',
          scenes: [
            { id: 'sc-001', heading: 'INT. LOCATION - DAY', pageRange: [1,5], synopsis: 'Opening scene establishing protagonist.', characters: ['PROTAGONIST'], diagnostics: { status: 'pass', beatQuestion: 'Will protagonist discover inciting event?', hasProtagonist: true, bPresent: true, mPresent: true, oPresent: true, cPresent: true, valueShift: true }, text: 'Scene text will appear here once parsed.', notes: [], tasks: [], beats: [], edits: [] }
          ]
        }]
      },
      {
        id: 'act-2', label: 'Act II — Conflict', pageRange: [Math.floor(pageCount * 0.25), Math.floor(pageCount * 0.75)],
        diagnostics: { status: 'warn', note: 'Review midpoint timing.' },
        sequences: []
      },
      {
        id: 'act-3', label: 'Act III — Resolution', pageRange: [Math.floor(pageCount * 0.75), pageCount],
        diagnostics: { status: 'pass', note: 'Resolution sequence.' },
        sequences: []
      }
    ]
  }
}

function getMissingBMOC(diagnostics) {
  if (!diagnostics) return 'Unknown'
  const missing = []
  if (!diagnostics.bPresent) missing.push('Beginning')
  if (!diagnostics.mPresent) missing.push('Middle')
  if (!diagnostics.oPresent) missing.push('Obstacle')
  if (!diagnostics.cPresent) missing.push('Climax')
  return missing.length ? missing.join(', ') : 'None — all BMOC present'
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)) }
