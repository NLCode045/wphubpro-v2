import { useMemo } from 'react'

type DocArticleBodyProps = {
  html: string
  className?: string
}

/**
 * Renders trusted HTML from the docs store (admin-edited / seeded). Same-origin only.
 */
export function DocArticleBody({ html, className }: DocArticleBodyProps) {
  const sanitizedClass = useMemo(() => ['docs-article-body', className].filter(Boolean).join(' '), [className])
  return <div className={sanitizedClass} dangerouslySetInnerHTML={{ __html: html }} />
}
