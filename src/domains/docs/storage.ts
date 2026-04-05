import type { DocArticle, DocCategory } from './types'

const STORAGE_KEY = 'wphubpro.docs.v1'

export type DocsStoragePayload = {
  categories?: DocCategory[]
  articles?: DocArticle[]
}

export function loadDocsFromStorage(): DocsStoragePayload | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as DocsStoragePayload
    if (!parsed || typeof parsed !== 'object') return null
    return parsed
  } catch {
    return null
  }
}

export function saveDocsToStorage(payload: DocsStoragePayload): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    /* quota or private mode */
  }
}

export function clearDocsStorage(): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
