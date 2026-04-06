import { MOCK_DOC_ARTICLES, MOCK_DOC_CATEGORIES } from '@/domains/docs/mockSeed'
import type { DocArticle, DocCategory } from '@/domains/docs/types'
import { clearDocsStorage, loadDocsFromStorage, saveDocsToStorage } from '@/domains/docs/storage'
import { type ReactNode, createContext, useCallback, useContext, useMemo, useState } from 'react'

type DocsContextValue = {
  categories: DocCategory[]
  articles: DocArticle[]
  articleBySlug: Map<string, DocArticle>
  getArticle: (slug: string) => DocArticle | undefined
  updateArticle: (slug: string, patch: Partial<Pick<DocArticle, 'title' | 'categoryId' | 'tags' | 'excerpt' | 'contentHtml' | 'sortOrder'>>) => void
  resetToMock: () => void
}

const DocsContext = createContext<DocsContextValue | null>(null)

function mergeSeedWithStorage(): { categories: DocCategory[]; articles: DocArticle[] } {
  const stored = loadDocsFromStorage()
  const catById = new Map<string, DocCategory>()
  for (const c of MOCK_DOC_CATEGORIES) catById.set(c.id, { ...c })
  if (stored?.categories?.length) {
    for (const c of stored.categories) catById.set(c.id, { ...c })
  }
  const categories = [...catById.values()].sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label))

  const artBySlug = new Map<string, DocArticle>()
  for (const a of MOCK_DOC_ARTICLES) artBySlug.set(a.slug, { ...a })
  if (stored?.articles?.length) {
    for (const a of stored.articles) {
      const base = artBySlug.get(a.slug)
      artBySlug.set(a.slug, base ? { ...base, ...a } : { ...a })
    }
  }
  const articles = [...artBySlug.values()].sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title))

  return { categories, articles }
}

export function DocsProvider({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState(0)
  const { categories, articles } = useMemo(() => {
    void version
    return mergeSeedWithStorage()
  }, [version])

  const articleBySlug = useMemo(() => new Map(articles.map((a) => [a.slug, a])), [articles])

  const persist = useCallback((nextCategories: DocCategory[], nextArticles: DocArticle[]) => {
    saveDocsToStorage({
      categories: nextCategories.filter((c) => MOCK_DOC_CATEGORIES.some((m) => m.id === c.id)),
      articles: nextArticles.filter((a) => MOCK_DOC_ARTICLES.some((m) => m.slug === a.slug)),
    })
    setVersion((v) => v + 1)
  }, [])

  const getArticle = useCallback((slug: string) => articleBySlug.get(slug), [articleBySlug])

  const updateArticle = useCallback(
    (
      slug: string,
      patch: Partial<Pick<DocArticle, 'title' | 'categoryId' | 'tags' | 'excerpt' | 'contentHtml' | 'sortOrder'>>,
    ) => {
      const { categories: cats, articles: arts } = mergeSeedWithStorage()
      const idx = arts.findIndex((a) => a.slug === slug)
      if (idx < 0) return
      const nextArts = [...arts]
      nextArts[idx] = { ...nextArts[idx], ...patch }
      persist(cats, nextArts)
    },
    [persist],
  )

  const resetToMock = useCallback(() => {
    clearDocsStorage()
    setVersion((v) => v + 1)
  }, [])

  const value = useMemo(
    (): DocsContextValue => ({
      categories,
      articles,
      articleBySlug,
      getArticle,
      updateArticle,
      resetToMock,
    }),
    [categories, articles, articleBySlug, getArticle, updateArticle, resetToMock],
  )

  return <DocsContext.Provider value={value}>{children}</DocsContext.Provider>
}

export function useDocs(): DocsContextValue {
  const ctx = useContext(DocsContext)
  if (!ctx) throw new Error('useDocs must be used within DocsProvider')
  return ctx
}
