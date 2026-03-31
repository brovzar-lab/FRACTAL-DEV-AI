/**
 * PDF Parser — uses pdfjs-dist to extract text from a PDF
 * Preserves page numbers and structure for Claude to interpret
 */

import * as pdfjsLib from 'pdfjs-dist'

// Set worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

/**
 * Parse a PDF File object into raw text with page markers
 * @param {File} file
 * @returns {{ rawText: string, pageCount: number, pages: string[] }}
 */
export async function parsePDF(file) {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const pageCount = pdf.numPages
  const pages = []

  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    const lines = textContent.items.map(item => item.str).join('\n')
    pages.push(lines)
  }

  const rawText = pages.map((p, i) => `--- PAGE ${i + 1} ---\n${p}`).join('\n\n')
  return { rawText, pageCount, pages }
}

/**
 * Parse a Fountain (.fountain) File object
 * Basic extraction — Claude will do the real structure parse
 */
export async function parseFountain(file) {
  const text = await file.text()
  const lines = text.split('\n')
  const pages = chunkIntoPages(lines, 55) // ~55 lines per page
  const rawText = pages.map((p, i) => `--- PAGE ${i + 1} ---\n${p.join('\n')}`).join('\n\n')
  return { rawText, pageCount: pages.length, pages: pages.map(p => p.join('\n')) }
}

/**
 * Parse a Final Draft (.fdx) XML file
 * Extracts scene headings, dialogue, action
 */
export async function parseFDX(file) {
  const text = await file.text()
  const parser = new DOMParser()
  const doc = parser.parseFromString(text, 'text/xml')

  const paragraphs = doc.querySelectorAll('Paragraph')
  const lines = []

  paragraphs.forEach(para => {
    const type = para.getAttribute('Type') || ''
    const texts = [...para.querySelectorAll('Text')].map(t => t.textContent).join('')
    if (!texts.trim()) return

    switch (type) {
      case 'Scene Heading':
        lines.push(`\n${texts.toUpperCase()}`)
        break
      case 'Character':
        lines.push(`                              ${texts}`)
        break
      case 'Dialogue':
        lines.push(`                    ${texts}`)
        break
      case 'Parenthetical':
        lines.push(`                         ${texts}`)
        break
      case 'Transition':
        lines.push(`                                             ${texts}`)
        break
      default:
        lines.push(texts)
    }
  })

  const pages = chunkIntoPages(lines, 55)
  const rawText = pages.map((p, i) => `--- PAGE ${i + 1} ---\n${p.join('\n')}`).join('\n\n')
  return { rawText, pageCount: pages.length, pages: pages.map(p => p.join('\n')) }
}

function chunkIntoPages(lines, linesPerPage) {
  const pages = []
  for (let i = 0; i < lines.length; i += linesPerPage) {
    pages.push(lines.slice(i, i + linesPerPage))
  }
  return pages
}

/**
 * Auto-detect format and parse
 */
export async function parseScreenplayFile(file) {
  const name = file.name.toLowerCase()
  if (name.endsWith('.pdf')) return { format: 'pdf', ...(await parsePDF(file)) }
  if (name.endsWith('.fdx')) return { format: 'fdx', ...(await parseFDX(file)) }
  if (name.endsWith('.fountain') || name.endsWith('.txt')) return { format: 'fountain', ...(await parseFountain(file)) }
  throw new Error(`Unsupported format: ${file.name}. Upload a PDF, FDX, or Fountain file.`)
}
