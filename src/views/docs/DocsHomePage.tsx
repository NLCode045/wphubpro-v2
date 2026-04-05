import PageMetaData from '@/components/PageMetaData'
import { ROUTE_PATHS } from '@/config/routePaths'
import { useDocs } from '@/domains/docs/DocsContext'
import type { DocArticle } from '@/domains/docs/types'
import { useEffect, useMemo, useState } from 'react'
import { Badge, Card, Col, Container, Form, InputGroup, ListGroup, Row } from 'react-bootstrap'
import { LuSearch } from 'react-icons/lu'
import { Link, useSearchParams } from 'react-router'
import SimpleBar from 'simplebar-react'

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

export default function DocsHomePage() {
  const { categories, articles } = useDocs()
  const [searchParams, setSearchParams] = useSearchParams()
  const [q, setQ] = useState('')
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)

  useEffect(() => {
    const cat = searchParams.get('cat')
    if (cat && categories.some((c) => c.id === cat)) {
      setActiveCategoryId(cat)
    }
  }, [categories, searchParams])

  const needle = q.trim().toLowerCase()

  const filteredArticles = useMemo(() => {
    if (!needle) return articles
    return articles.filter((a) => {
      const blob = [a.title, a.excerpt, a.slug, ...a.tags, stripHtml(a.contentHtml)].join(' ').toLowerCase()
      return blob.includes(needle)
    })
  }, [articles, needle])

  const byCategory = useMemo(() => {
    const m = new Map<string, DocArticle[]>()
    for (const c of categories) m.set(c.id, [])
    for (const a of filteredArticles) {
      const list = m.get(a.categoryId)
      if (list) list.push(a)
    }
    for (const [, list] of m) list.sort((x, y) => x.sortOrder - y.sortOrder || x.title.localeCompare(y.title))
    return m
  }, [categories, filteredArticles])

  const setCategory = (id: string | null) => {
    setActiveCategoryId(id)
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (id) next.set('cat', id)
        else next.delete('cat')
        return next
      },
      { replace: true },
    )
  }

  const navCategories = categories.filter((c) => (byCategory.get(c.id)?.length ?? 0) > 0 || !needle)

  const visibleArticles: DocArticle[] = useMemo(() => {
    if (activeCategoryId) return byCategory.get(activeCategoryId) ?? []
    return filteredArticles
  }, [activeCategoryId, byCategory, filteredArticles])

  return (
    <Container fluid>
      <PageMetaData title="Help & documentation" />
      <Row className="g-3">
        <Col lg={3} xl={3}>
          <Card className="border shadow-sm h-100">
            <Card.Header className="bg-transparent py-3">
              <Card.Title as="h5" className="mb-0">
                Knowledge base
              </Card.Title>
              <p className="text-muted small mb-0 mt-1">Browse by topic or search every article.</p>
            </Card.Header>
            <Card.Body className="pt-0">
              <Form.Label className="small text-muted">Search</Form.Label>
              <InputGroup className="mb-3">
                <InputGroup.Text className="bg-light border-end-0">
                  <LuSearch className="text-muted" />
                </InputGroup.Text>
                <Form.Control
                  className="border-start-0 ps-0"
                  placeholder="Titles, tags, body text…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  aria-label="Search documentation"
                />
              </InputGroup>
              <div className="small text-muted mb-2">Categories</div>
              <SimpleBar style={{ maxHeight: 'min(60vh, 520px)' }}>
                <ListGroup variant="flush" className="border rounded overflow-hidden">
                  <ListGroup.Item
                    action
                    active={activeCategoryId === null}
                    onClick={() => setCategory(null)}
                    className="py-2"
                  >
                    All articles
                    <Badge bg="secondary" className="ms-2 fw-normal">
                      {filteredArticles.length}
                    </Badge>
                  </ListGroup.Item>
                  {navCategories.map((c) => {
                    const n = byCategory.get(c.id)?.length ?? 0
                    if (!needle && n === 0) return null
                    return (
                      <ListGroup.Item
                        key={c.id}
                        action
                        active={activeCategoryId === c.id}
                        onClick={() => setCategory(c.id)}
                        className="py-2"
                      >
                        {c.label}
                        <Badge bg="light" text="dark" className="ms-2 border fw-normal">
                          {n}
                        </Badge>
                      </ListGroup.Item>
                    )
                  })}
                </ListGroup>
              </SimpleBar>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={9} xl={9}>
          <Card className="border shadow-sm">
            <Card.Header className="bg-transparent py-3 d-flex flex-wrap align-items-center justify-content-between gap-2">
              <div>
                <Card.Title as="h5" className="mb-0">
                  {activeCategoryId
                    ? categories.find((c) => c.id === activeCategoryId)?.label ?? 'Articles'
                    : needle
                      ? 'Search results'
                      : 'All articles'}
                </Card.Title>
                {needle ? (
                  <p className="text-muted small mb-0 mt-1">
                    {visibleArticles.length} match{visibleArticles.length === 1 ? '' : 'es'} for “{q.trim()}”.
                  </p>
                ) : null}
              </div>
            </Card.Header>
            <Card.Body className="pt-0">
              {visibleArticles.length === 0 ? (
                <p className="text-muted mb-0">No articles match your search. Try another keyword or clear the filter.</p>
              ) : (
                <ListGroup variant="flush">
                  {visibleArticles.map((a) => (
                    <ListGroup.Item key={a.slug} className="px-0 py-3 border-light">
                      <Link
                        to={`${ROUTE_PATHS.DOCS}/a/${encodeURIComponent(a.slug)}`}
                        className="fw-semibold text-decoration-none d-block mb-1"
                      >
                        {a.title}
                      </Link>
                      <p className="text-muted small mb-2">{a.excerpt}</p>
                      <div className="d-flex flex-wrap gap-1 align-items-center">
                        <Badge bg="primary" className="fw-normal">
                          {categories.find((c) => c.id === a.categoryId)?.label ?? a.categoryId}
                        </Badge>
                        {a.tags.map((t) => (
                          <Badge key={t} bg="light" text="dark" className="border fw-normal">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  )
}
