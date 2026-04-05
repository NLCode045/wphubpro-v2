import { DocArticleBody } from '@/components/docs/DocArticleBody'
import PageMetaData from '@/components/PageMetaData'
import { ROUTE_PATHS } from '@/config/routePaths'
import { useDocs } from '@/domains/docs/DocsContext'
import { Badge, Breadcrumb, BreadcrumbItem, Card, Col, Container, Row } from 'react-bootstrap'
import { Link, Navigate, useParams } from 'react-router'

export default function DocsArticlePage() {
  const { slug: rawSlug } = useParams<{ slug: string }>()
  const slug = rawSlug ? decodeURIComponent(rawSlug) : ''
  const { getArticle, categories, articles } = useDocs()
  const article = slug ? getArticle(slug) : undefined

  if (!slug) {
    return <Navigate to={ROUTE_PATHS.DOCS} replace />
  }

  if (!article) {
    return (
      <Container fluid>
        <PageMetaData title="Article not found" />
        <Card className="border shadow-sm">
          <Card.Body>
            <h4 className="mb-2">Article not found</h4>
            <p className="text-muted mb-3">The link may be outdated or the slug is wrong.</p>
            <Link to={ROUTE_PATHS.DOCS} className="btn btn-primary btn-sm">
              Back to knowledge base
            </Link>
          </Card.Body>
        </Card>
      </Container>
    )
  }

  const category = categories.find((c) => c.id === article.categoryId)
  const related = articles
    .filter((a) => a.slug !== article.slug && (a.categoryId === article.categoryId || a.tags.some((t) => article.tags.includes(t))))
    .slice(0, 6)

  return (
    <Container fluid>
      <PageMetaData title={article.title} />
      <Breadcrumb className="mb-3">
        <BreadcrumbItem linkAs={Link} href={ROUTE_PATHS.DOCS}>
          Help & docs
        </BreadcrumbItem>
        {category ? (
          <BreadcrumbItem linkAs={Link} href={`${ROUTE_PATHS.DOCS}?cat=${encodeURIComponent(category.id)}`}>
            {category.label}
          </BreadcrumbItem>
        ) : null}
        <BreadcrumbItem active>{article.title}</BreadcrumbItem>
      </Breadcrumb>

      <Row className="g-3">
        <Col lg={8} xl={8}>
          <Card className="border shadow-sm">
            <Card.Body>
              <div className="d-flex flex-wrap gap-2 mb-3">
                {category ? (
                  <Badge bg="primary" className="fw-normal">
                    {category.label}
                  </Badge>
                ) : null}
                {article.tags.map((t) => (
                  <Badge key={t} bg="light" text="dark" className="border fw-normal">
                    {t}
                  </Badge>
                ))}
              </div>
              <h1 className="h3 fw-bold mb-3">{article.title}</h1>
              <p className="text-muted small mb-4">Last updated {article.updatedAt}</p>
              <DocArticleBody html={article.contentHtml} />
            </Card.Body>
          </Card>
        </Col>
        <Col lg={4} xl={4}>
          <Card className="border shadow-sm">
            <Card.Header className="bg-transparent py-3">
              <Card.Title as="h6" className="mb-0">
                Related articles
              </Card.Title>
            </Card.Header>
            <Card.Body className="pt-0">
              {related.length === 0 ? (
                <p className="text-muted small mb-0">Open the main index to browse all topics.</p>
              ) : (
                <ul className="list-unstyled mb-0 d-flex flex-column gap-2">
                  {related.map((a) => (
                    <li key={a.slug}>
                      <Link to={`${ROUTE_PATHS.DOCS}/a/${encodeURIComponent(a.slug)}`} className="text-decoration-none">
                        {a.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <Link to={ROUTE_PATHS.DOCS} className="btn btn-outline-primary btn-sm mt-3 w-100">
                All articles
              </Link>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  )
}
