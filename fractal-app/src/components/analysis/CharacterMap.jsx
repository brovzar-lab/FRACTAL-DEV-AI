import useScreenplayStore from '../../store/screenplayStore'

/**
 * CharacterMap — Visual grid: characters (rows) × scenes (columns)
 * Click a cell to navigate to that scene
 */
export default function CharacterMap() {
  const { screenplay, drillInto } = useScreenplayStore()
  const allScenes = screenplay.acts.flatMap(a => a.sequences.flatMap(s => s.scenes))

  // Build character frequency map
  const charMap = {}
  allScenes.forEach(sc => {
    (sc.characters || []).forEach(c => {
      if (!charMap[c]) charMap[c] = { name: c, scenes: new Set(), count: 0 }
      charMap[c].scenes.add(sc.id)
      charMap[c].count++
    })
  })

  // Sort by frequency
  const characters = Object.values(charMap).sort((a, b) => b.count - a.count)

  if (characters.length === 0) {
    return (
      <div style={{ padding: 16, fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
        No character data available.
      </div>
    )
  }

  // Detect gaps: characters who appear then vanish for 3+ scenes
  const detectGaps = (char) => {
    let lastSeenIdx = -1
    let maxGap = 0
    allScenes.forEach((sc, i) => {
      if (char.scenes.has(sc.id)) {
        if (lastSeenIdx >= 0) {
          const gap = i - lastSeenIdx - 1
          if (gap > maxGap) maxGap = gap
        }
        lastSeenIdx = i
      }
    })
    return maxGap
  }

  // Act color for column headers
  const getActForScene = (sceneId) => {
    for (let ai = 0; ai < screenplay.acts.length; ai++) {
      for (const seq of screenplay.acts[ai].sequences) {
        if (seq.scenes.some(s => s.id === sceneId)) return ai
      }
    }
    return 0
  }

  const ACT_BG = [
    'rgba(27,79,138,0.15)',
    'rgba(184,92,44,0.15)',
    'rgba(42,125,111,0.15)',
    'rgba(123,79,158,0.15)',
    'rgba(192,154,48,0.15)',
  ]

  return (
    <div style={{ overflow: 'auto' }}>
      <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8, paddingLeft: 4 }}>
        Character Coverage ({characters.length} characters × {allScenes.length} scenes)
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: '0.7rem', width: '100%' }}>
          <thead>
            <tr>
              <th style={{ position: 'sticky', left: 0, background: 'var(--bg-surface)', zIndex: 2, padding: '4px 8px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', borderBottom: '1px solid var(--border-default)' }}>
                Character
              </th>
              {allScenes.map((sc, i) => (
                <th key={sc.id} style={{
                  padding: '2px 1px', fontWeight: 400, color: 'var(--text-muted)',
                  borderBottom: '1px solid var(--border-default)',
                  background: ACT_BG[getActForScene(sc.id) % ACT_BG.length],
                  writingMode: 'vertical-lr', textOrientation: 'mixed',
                  fontSize: '0.55rem', height: 60,
                  cursor: 'pointer',
                }}
                  title={sc.heading}
                  onClick={() => drillInto('scene', sc.id)}
                >
                  {`Sc${i + 1}`}
                </th>
              ))}
              <th style={{ padding: '4px 6px', textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)', borderBottom: '1px solid var(--border-default)' }}>
                #
              </th>
            </tr>
          </thead>
          <tbody>
            {characters.map(char => {
              const gap = detectGaps(char)
              return (
                <tr key={char.name}>
                  <td style={{
                    position: 'sticky', left: 0, background: 'var(--bg-surface)', zIndex: 1,
                    padding: '3px 8px', fontWeight: 500, whiteSpace: 'nowrap',
                    color: 'var(--text-primary)', borderBottom: '1px solid var(--border-default)',
                  }}>
                    {char.name}
                    {gap >= 3 && (
                      <span style={{ color: '#C09A30', fontSize: '0.55rem', marginLeft: 4 }} title={`${gap}-scene gap detected`}>
                        ⚠ gap
                      </span>
                    )}
                  </td>
                  {allScenes.map(sc => {
                    const present = char.scenes.has(sc.id)
                    return (
                      <td key={sc.id} style={{
                        padding: 0, textAlign: 'center',
                        borderBottom: '1px solid var(--border-default)',
                        cursor: present ? 'pointer' : 'default',
                      }}
                        onClick={() => present && drillInto('scene', sc.id)}
                      >
                        {present && (
                          <div style={{
                            width: 10, height: 10, borderRadius: 2,
                            background: '#2A7D6F',
                            margin: '2px auto',
                          }} />
                        )}
                      </td>
                    )
                  })}
                  <td style={{
                    padding: '3px 6px', textAlign: 'center',
                    fontWeight: 600, color: 'var(--text-muted)',
                    borderBottom: '1px solid var(--border-default)',
                  }}>
                    {char.count}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
