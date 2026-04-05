import { ROUTE_PATHS } from '@/config/routePaths'
import { useDocs } from '@/domains/docs/DocsContext'
import type { DocArticle } from '@/domains/docs/types'
import { Button, Modal, ModalBody, ModalFooter, ModalHeader } from 'react-bootstrap'
import { Link } from 'react-router'

type DocHelpModalProps = {
  show: boolean
  onHide: () => void
  title?: string
  articleSlugs: readonly string[]
}

export function DocHelpModal({ show, onHide, title = 'Related help articles', articleSlugs }: DocHelpModalProps) {
  const { getArticle } = useDocs()

  const articles: DocArticle[] = articleSlugs
    .map((s) => getArticle(s))
    .filter((a): a is DocArticle => Boolean(a))

  return (
    <Modal show={show} onHide={onHide} size="lg" centered scrollable>
      <ModalHeader closeButton>
        <Modal.Title as="h5" className="m-0">
          {title}
        </Modal.Title>
      </ModalHeader>
      <ModalBody>
        {articles.length === 0 ? (
          <p className="text-muted mb-0">No linked articles for this screen yet. Open the full docs from the sidebar.</p>
        ) : (
          <ul className="list-unstyled mb-0 d-flex flex-column gap-3">
            {articles.map((a) => (
              <li key={a.slug} className="border rounded p-3">
                <Link
                  to={`${ROUTE_PATHS.DOCS}/a/${encodeURIComponent(a.slug)}`}
                  className="fw-semibold text-decoration-none d-block mb-1"
                  onClick={onHide}
                >
                  {a.title}
                </Link>
                {a.excerpt ? <p className="text-muted small mb-2">{a.excerpt}</p> : null}
                <div className="d-flex flex-wrap gap-1">
                  {a.tags.map((t) => (
                    <span key={t} className="badge bg-light text-dark border fw-normal">
                      {t}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </ModalBody>
      <ModalFooter className="border-top-0 pt-0">
        <Link to={ROUTE_PATHS.DOCS} className="btn btn-primary btn-sm" onClick={onHide}>
          Open full knowledge base
        </Link>
        <Button variant="light" size="sm" onClick={onHide}>
          Close
        </Button>
      </ModalFooter>
    </Modal>
  )
}
