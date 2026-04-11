/**
 * indexCardUtils.js
 * Deterministic "random" styling for scene index cards.
 * Each sceneId always maps to the same pastel color + rotation + skew.
 */

const PASTEL_COLORS = [
  '#FFF8E7', // cream
  '#FFF0B8', // yellow
  '#D0EED8', // mint
  '#FFD9C0', // peach
  '#FFD0D8', // pink
  '#DDD0F0', // lavender
  '#D0E8F5', // sky
]

/**
 * Simple deterministic hash from a string.
 * Same input → same output, always.
 */
function hashCode(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0 // Convert to 32bit int
  }
  return hash
}

/**
 * Returns a deterministic card style object for a given sceneId.
 *
 * @param {string} sceneId — unique scene identifier
 * @returns {{ backgroundColor: string, transform: string }}
 */
export function getCardStyle(sceneId) {
  const hash = hashCode(sceneId || 'default')
  const absHash = Math.abs(hash)

  // --- Color ---
  const colorIndex = absHash % PASTEL_COLORS.length
  const backgroundColor = PASTEL_COLORS[colorIndex]

  // --- Transform type (A / B / C) ---
  const typeRoll = absHash % 10 // 0-9

  // Rotation: small, bidirectional
  const rotSign = (hash % 2 === 0) ? 1 : -1
  let rotation, skew

  if (typeRoll < 5) {
    // Type A (50%): tilt only
    rotation = rotSign * 0.3
    skew = 0
  } else if (typeRoll < 8) {
    // Type B (30%): tilt + lean
    rotation = rotSign * 0.4
    skew = 0.3
  } else {
    // Type C (20%): tilt + opposite lean
    rotation = rotSign * 0.5
    skew = -0.3
  }

  const transform = skew !== 0
    ? `rotate(${rotation}deg) skewY(${skew}deg)`
    : `rotate(${rotation}deg)`

  return { backgroundColor, transform }
}

/**
 * Returns just the pastel color for a sceneId (no transform).
 * Useful for contexts where rotation isn't desired.
 */
export function getCardColor(sceneId) {
  const hash = hashCode(sceneId || 'default')
  return PASTEL_COLORS[Math.abs(hash) % PASTEL_COLORS.length]
}
