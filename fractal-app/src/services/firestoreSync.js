import { db } from './firebase'
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
} from 'firebase/firestore'

const COLLECTION = 'fractal-screenplays'
const DEBOUNCE_MS = 2000

let debounceTimer = null

/**
 * Save screenplay state to Firestore
 * Debounced — won't fire more than once per DEBOUNCE_MS
 */
export function saveScreenplayDebounced(state) {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    saveScreenplay(state)
  }, DEBOUNCE_MS)
}

/**
 * Save screenplay state immediately
 */
export async function saveScreenplay(state) {
  if (!state.screenplay?.id) return

  const docId = state.screenplay.id
  const payload = {
    screenplay: state.screenplay,
    tasks: state.tasks || [],
    lens: state.lens,
    updatedAt: serverTimestamp(),
  }

  try {
    const ref = doc(db, COLLECTION, docId)
    const snapshot = await getDoc(ref)
    if (snapshot.exists()) {
      await updateDoc(ref, payload)
    } else {
      await setDoc(ref, {
        ...payload,
        createdAt: serverTimestamp(),
      })
    }
    console.log('[Firestore] Saved:', docId)
  } catch (e) {
    console.warn('[Firestore] Save failed:', e.message)
  }
}

/**
 * Load a specific screenplay from Firestore
 */
export async function loadScreenplay(docId) {
  try {
    const ref = doc(db, COLLECTION, docId)
    const snapshot = await getDoc(ref)
    if (snapshot.exists()) {
      console.log('[Firestore] Loaded:', docId)
      return snapshot.data()
    }
    return null
  } catch (e) {
    console.warn('[Firestore] Load failed:', e.message)
    return null
  }
}

/**
 * Load the most recently saved screenplay
 */
export async function loadLatestScreenplay() {
  try {
    const q = query(
      collection(db, COLLECTION),
      orderBy('updatedAt', 'desc'),
      limit(1)
    )
    const snapshot = await getDocs(q)
    if (!snapshot.empty) {
      const data = snapshot.docs[0].data()
      console.log('[Firestore] Loaded latest:', data.screenplay?.title)
      return data
    }
    return null
  } catch (e) {
    console.warn('[Firestore] Load latest failed:', e.message)
    return null
  }
}

/**
 * List all saved screenplays (for Project Lobby)
 */
export async function listScreenplays() {
  try {
    const q = query(
      collection(db, COLLECTION),
      orderBy('updatedAt', 'desc'),
      limit(50)
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(d => {
      const data = d.data()
      return {
        id: d.id,
        title: data.screenplay?.title || 'Untitled',
        genre: data.screenplay?.genre || '',
        pageCount: data.screenplay?.pageCount || 0,
        updatedAt: data.updatedAt?.toDate?.() || null,
        createdAt: data.createdAt?.toDate?.() || null,
      }
    })
  } catch (e) {
    console.warn('[Firestore] List failed:', e.message)
    return []
  }
}

/**
 * Delete a screenplay from Firestore
 */
export async function deleteScreenplay(docId) {
  try {
    await deleteDoc(doc(db, COLLECTION, docId))
    console.log('[Firestore] Deleted:', docId)
    return true
  } catch (e) {
    console.warn('[Firestore] Delete failed:', e.message)
    return false
  }
}

