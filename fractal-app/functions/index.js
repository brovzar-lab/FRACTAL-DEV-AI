import { onRequest } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'

const anthropicKey = defineSecret('ANTHROPIC_API_KEY')

/**
 * Claude API Proxy for Fractal-AI
 * 
 * Accepts: { message, systemPrompt?, model?, max_tokens? }
 * Returns: { content, model, usage }
 */
export const analyze = onRequest(
  {
    cors: true,
    maxInstances: 10,
    timeoutSeconds: 540,
    memory: '1GiB',
    secrets: [anthropicKey],
  },
  async (req, res) => {
    // Explicit CORS headers (belt + suspenders)
    res.set('Access-Control-Allow-Origin', '*')
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.set('Access-Control-Allow-Headers', 'Content-Type')

    // Handle preflight
    if (req.method === 'OPTIONS') {
      res.status(204).send('')
      return
    }

    // Only POST
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' })
      return
    }

    const {
      message,
      systemPrompt = 'You are a master screenplay analyst. Return only valid JSON unless told otherwise.',
      model = 'claude-sonnet-4-20250514',
      max_tokens = 4096,
    } = req.body || {}

    if (!message) {
      res.status(400).json({ error: 'Missing "message" in request body' })
      return
    }

    try {
      const apiKey = anthropicKey.value()
      
      if (!apiKey) {
        res.status(500).json({ error: 'ANTHROPIC_API_KEY secret is not configured' })
        return
      }

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens,
          system: systemPrompt,
          messages: [{ role: 'user', content: message }],
        }),
      })

      if (!response.ok) {
        const errorBody = await response.text()
        console.error(`Anthropic API error ${response.status}:`, errorBody)
        res.status(response.status).json({
          error: `Anthropic API error: ${response.status}`,
          detail: errorBody,
        })
        return
      }

      const data = await response.json()

      // Extract text content from Claude's response
      const textContent = data.content
        ?.filter(block => block.type === 'text')
        ?.map(block => block.text)
        ?.join('') || ''

      res.json({
        content: textContent,
        model: data.model,
        usage: data.usage,
      })
    } catch (error) {
      console.error('Proxy error:', error)
      res.status(500).json({ error: 'Internal proxy error', detail: error.message })
    }
  }
)
