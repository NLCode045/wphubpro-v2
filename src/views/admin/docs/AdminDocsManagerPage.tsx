import { DocHelpButton } from '@/components/docs/DocHelpButton'
import PageBreadcrumb from '@/components/PageBreadcrumb'
import PageMetaData from '@/components/PageMetaData'
import { ROUTE_PATHS } from '@/config/routePaths'
import { useDashboardNav } from '@/context/DashboardNavContext'
import { useAuth } from '@/domains/auth'
import { useDocs } from '@/domains/docs/DocsContext'
import type { DocArticle } from '@/domains/docs/types'
import { useEffect, useMemo, useState } from 'react'
import {
  Accordion,
  Badge,
  Button,
  Card,
  Col,
  Container,
  Form,
  Modal,
  Row,
  Spinner,
} from 'react-bootstrap'
import { Link, useNavigate } from 'react-router'

function parseTags(raw: string): string[] {
  return raw
    .split(/[,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export default function AdminDocsManagerPage() {
  const { isAdmin } = useAuth()
  const { mode } = useDashboardNav()
  const navigate = useNavigate()
  const { categories, articles, updateArticle, resetToMock } = useDocs()

  const [editSlug, setEditSlug] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [tagsStr, setTagsStr] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [contentHtml, setContentHtml] = useState('')
  const [sortOrder, setSortOrder] = useState('0')

  useEffect(() => {
    if (!isAdmin) {
      navigate(ROUTE_PATHS.DASHBOARD, { replace: true })
      return
    }
    if (mode !== 'admin') {
      navigate(ROUTE_PATHS.DASHBOARD, { replace: true })
    }
  }, [isAdmin, mode, navigate])

  const editing = useMemo(() => articles.find((a) => a.slug === editSlug), [articles, editSlug])

  useEffect(() => {
    if (!editing) return
    setTitle(editing.title)
    setCategoryId(editing.categoryId)
    setTagsStr(editing.tags.join(', '))
    setExcerpt(editing.excerpt)
    setContentHtml(editing.contentHtml)
    setSortOrder(String(editing.sortOrder))
  }, [editing])

  const byCategory = useMemo(() => {
    const m = new Map<string, DocArticle[]>()
    for (const c of categories) m.set(c.id, [])
    for (const a of articles) {
      const list = m.get(a.categoryId)
      if (list) list.push(a)
    }
    for (const [, list] of m) list.sort((x, y) => x.sortOrder - y.sortOrder || x.title.localeCompare(y.title))
    return m
  }, [categories, articles])

  const openEdit = (a: DocArticle) => setEditSlug(a.slug)
  const closeEdit = () => setEditSlug(null)

  const save = () => {
    if (!editSlug) return
    const so = parseInt(sortOrder, 10)
    updateArticle(editSlug, {
      title: title.trim(),
      categoryId,
      tags: parseTags(tagsStr),
      excerpt: excerpt.trim(),
      contentHtml,
      sortOrder: Number.isFinite(so) ? so : 0,
    })
    closeEdit()
  }

  if (!isAdmin || mode !== 'admin') {
    return null
  }

  return (
    <Container fluid>
      <PageMetaData title="Docs manager" />
      <PageBreadcrumb title="Docs manager" subtitle="Admin" titleEnd={<DocHelpButton contextKey="admin:docs" />} />

      <Card className="border shadow-sm mb-3">
        <Card.Body className="d-flex flex-wrap align-items-center justify-content-between gap-2">
          <div>
            <h5 className="mb-1">Knowledge base articles</h5>
            <p className="text-muted small mb-0">
              Changes are saved in this browser (local storage) for testing. Use “Reset to seed” to restore mock data.
            </p>
          </div>
          <div className="d-flex flex-wrap gap-2">
            <Button variant="outline-secondary" size="sm" onClick={resetToMock}>
              Reset to seed
            </Button>
            <Link to={ROUTE_PATHS.DOCS} className="btn btn-primary btn-sm" target="_blank" rel="noreferrer">
              Open public docs
            </Link>
          </div>
        </Card.Body>
      </Card>

      <Accordion alwaysOpen defaultActiveKey={categories.map((c) => c.id)}>
        {categories.map((c) => {
          const list = byCategory.get(c.id) ?? []
          return (
            <Accordion.Item eventKey={c.id} key={c.id}>
              <Accordion.Header>
                {c.label}
                <Badge bg="secondary" className="ms-2 fw-normal">
                  {list.length}
                </Badge>
              </Accordion.Header>
              <Accordion.Body className="pt-0">
                {c.description ? <p className="text-muted small">{c.description}</p> : null}
                {list.length === 0 ? (
                  <p className="text-muted small mb-0">No articles in this category.</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm align-middle mb-0">
                      <thead>
                        <tr>
                          <th>Title</th>
                          <th>Slug</th>
                          <th>Tags</th>
                          <th className="text-end">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {list.map((a) => (
                          <tr key={a.slug}>
                            <td className="fw-medium">{a.title}</td>
                            <td>
                              <code className="small">{a.slug}</code>
                            </td>
                            <td>
                              <span className="small text-muted">{a.tags.join(', ') || '—'}</span>
                            </td>
                            <td className="text-end">
                              <Button variant="light" size="sm" className="border" onClick={() => openEdit(a)}>
                                Edit
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Accordion.Body>
            </Accordion.Item>
          )
        })}
      </Accordion>

      <Modal show={Boolean(editSlug)} onHide={closeEdit} size="lg" centered scrollable>
        <Modal.Header closeButton>
          <Modal.Title>Edit article</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editing ? (
            <Row className="g-3">
              <Col md={8}>
                <Form.Group className="mb-3">
                  <Form.Label>Title</Form.Label>
                  <Form.Control value={title} onChange={(e) => setTitle(e.target.value)} />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Sort order</Form.Label>
                  <Form.Control value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Category</Form.Label>
                  <Form.Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Tags (comma-separated)</Form.Label>
                  <Form.Control value={tagsStr} onChange={(e) => setTagsStr(e.target.value)} placeholder="e.g. sites, bridge" />
                </Form.Group>
              </Col>
              <Col xs={12}>
                <Form.Group className="mb-3">
                  <Form.Label>Excerpt</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    value={excerpt}
                    onChange={(e) => setExcerpt(e.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col xs={12}>
                <Form.Group className="mb-0">
                  <Form.Label>Content (HTML)</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={14}
                    value={contentHtml}
                    onChange={(e) => setContentHtml(e.target.value)}
                    className="font-monospace small"
                  />
                  <Form.Text muted>
                    Use <code>&lt;a href="/docs/a/slug"&gt;</code> for internal links. Slugs must match existing articles.
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
          ) : (
            <Spinner animation="border" />
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={closeEdit}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save} disabled={!title.trim()}>
            Save
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  )
}
