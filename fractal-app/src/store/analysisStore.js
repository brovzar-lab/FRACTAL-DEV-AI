import { create } from 'zustand'

// === Analysis Store ===
// Manages AI analysis results, cache, stale detection, and batch operations
const useAnalysisStore = create(
  (set, get) => ({
    // Analysis cache: keyed by `{type}-{id}-{lens}`
    // Each entry: { ...analysisData, cached: ISO string, contentHash: string }
    analysisCache: {},

    // Batch analysis state
    batchRunning: false,
    batchProgress: { current: 0, total: 0, currentScene: '' },

    // Cache an analysis result with content hash for stale detection
    cacheAnalysis: (key, data, contentHash = null) => set(s => ({
      analysisCache: {
        ...s.analysisCache,
        [key]: { ...data, cached: new Date().toISOString(), contentHash }
      }
    })),

    // Check if cached analysis is stale (content changed since analysis)
    isAnalysisStale: (key, currentContentHash) => {
      const cached = get().analysisCache[key]
      if (!cached) return true
      if (!cached.contentHash || !currentContentHash) return false // no hash = can't determine
      return cached.contentHash !== currentContentHash
    },

    // Invalidate a specific cache entry
    invalidateCache: (key) => set(s => {
      const next = { ...s.analysisCache }
      delete next[key]
      return { analysisCache: next }
    }),

    // Invalidate all cache entries for a scene across all lenses
    invalidateSceneCache: (sceneId) => set(s => {
      const next = {}
      for (const [key, val] of Object.entries(s.analysisCache)) {
        if (!key.startsWith(`scene-${sceneId}-`)) {
          next[key] = val
        }
      }
      return { analysisCache: next }
    }),

    // Clear all cache
    clearCache: () => set({ analysisCache: {} }),

    // Batch analysis tracking
    startBatch: (total) => set({ batchRunning: true, batchProgress: { current: 0, total, currentScene: '' } }),
    updateBatchProgress: (current, currentScene) => set(s => ({
      batchProgress: { ...s.batchProgress, current, currentScene }
    })),
    endBatch: () => set({ batchRunning: false, batchProgress: { current: 0, total: 0, currentScene: '' } }),
  })
)

export default useAnalysisStore
