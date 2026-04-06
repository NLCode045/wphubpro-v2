export type DocCategory = {
  id: string
  label: string
  description?: string
  sortOrder: number
}

export type DocArticle = {
  slug: string
  title: string
  categoryId: string
  tags: string[]
  excerpt: string
  contentHtml: string
  sortOrder: number
  updatedAt: string
}
