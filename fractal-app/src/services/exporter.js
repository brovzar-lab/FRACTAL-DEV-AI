/**
 * Screenplay Exporter — Fountain, Plain Text, Clipboard
 */

export function exportToFountain(screenplay) {
  let output = `Title: ${screenplay.title}\nCredit: written by\nDraft date: ${new Date().toISOString().slice(0, 10)}\n\n===\n\n`

  for (const act of screenplay.acts) {
    for (const seq of act.sequences) {
      for (const scene of seq.scenes) {
        output += fountainScene(scene)
      }
    }
  }

  return output.trim()
}

export function exportToText(screenplay) {
  let output = `${screenplay.title}\n${'='.repeat(screenplay.title.length)}\n\n`
  output += `Genre: ${screenplay.genre} | Pages: ${screenplay.pageCount}\n\n`

  for (const act of screenplay.acts) {
    output += `\n${'─'.repeat(60)}\n${act.label} (p.${act.pageRange[0]}–${act.pageRange[1]})\n${'─'.repeat(60)}\n\n`
    for (const seq of act.sequences) {
      output += `  ${seq.label}\n`
      for (const scene of seq.scenes) {
        output += `\n${scene.heading}\n`
        output += `${scene.text || '[No text]'}\n`
      }
    }
  }

  return output.trim()
}

export function sceneToFountain(scene) {
  return fountainScene(scene)
}

export function copyToClipboard(text) {
  return navigator.clipboard.writeText(text)
}

export function downloadFile(content, filename, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// Internal Fountain formatter
function fountainScene(scene) {
  let out = ''
  const heading = scene.heading?.trim() || ''

  // Force scene heading (Fountain spec: line starting with INT or EXT is auto-detected)
  if (heading) {
    out += `\n${heading}\n\n`
  }

  const text = scene.text || ''
  // The scene text might already be formatted; just pass it through
  out += `${text}\n\n`

  return out
}
