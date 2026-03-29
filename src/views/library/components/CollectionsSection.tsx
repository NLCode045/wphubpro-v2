import type { LibraryCollection, LibraryCollectionMember } from '@/types'
import { useMemo } from 'react'
import { Card, CardBody, Col, Row, Table } from 'react-bootstrap'
import { LuSearch } from 'react-icons/lu'
import type { LibraryViewMode } from './ViewModeToggle'

function memberLabel(m: LibraryCollectionMember): string {
  return `${m.slug} (${m.type})`;
}

type CollectionsSectionProps = {
  collections: LibraryCollection[];
  view: LibraryViewMode;
  search: string;
  onSearchChange: (v: string) => void;
};

const CollectionsSection = ({ collections, view, search, onSearchChange }: CollectionsSectionProps) => {
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return collections;
    return collections.filter((c) => c.name.toLowerCase().includes(q));
  }, [collections, search]);

  const searchBar = (
    <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
      <div className="app-search flex-grow-1" style={{ minWidth: '12rem', maxWidth: '28rem' }}>
        <input
          type="search"
          className="form-control"
          placeholder="Search collections…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search collections"
        />
        <LuSearch className="app-search-icon text-muted" />
      </div>
    </div>
  );

  if (collections.length === 0) {
    return (
      <>
        {searchBar}
        <p className="text-muted text-center py-5 mb-0">No collections yet.</p>
      </>
    );
  }

  if (view === 'grid') {
    return (
      <>
        {searchBar}
        {filtered.length === 0 ? (
          <p className="text-muted text-center py-5 mb-0">No collections match your search.</p>
        ) : (
          <Row className="g-3">
            {filtered.map((c) => (
              <Col key={c.$id} xs={12} sm={6} xl={4}>
                <Card className="h-100 shadow-sm">
                  <CardBody>
                    <h6 className="mb-2 text-truncate" title={c.name}>
                      {c.name}
                    </h6>
                    <p className="text-muted fs-xs mb-2">
                      {c.items.length} item{c.items.length === 1 ? '' : 's'}
                    </p>
                    <div className="d-flex flex-wrap gap-1">
                      {c.items.length === 0 ? (
                        <span className="text-muted fs-xs">No items yet</span>
                      ) : (
                        c.items.map((m) => (
                          <span key={`${c.$id}-${m.slug}-${m.type}`} className="badge badge-soft-secondary fs-xxs">
                            {memberLabel(m)}
                          </span>
                        ))
                      )}
                    </div>
                  </CardBody>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </>
    );
  }

  return (
    <>
      {searchBar}
      <div className="table-responsive border rounded">
        <Table hover className="table table-custom table-centered mb-0 align-middle">
          <thead className="bg-light bg-opacity-25 thead-sm">
            <tr className="text-uppercase fs-xxs">
              <th>Name</th>
              <th>Items</th>
              <th className="text-end">Count</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-center text-muted py-4">
                  No collections match your search.
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.$id}>
                  <td className="fw-medium">{c.name}</td>
                  <td>
                    {c.items.length === 0 ? (
                      <span className="text-muted fs-xs">—</span>
                    ) : (
                      <span className="d-flex flex-wrap gap-1">
                        {c.items.map((m) => (
                          <span key={`${m.slug}-${m.type}`} className="badge badge-soft-secondary fs-xxs">
                            {memberLabel(m)}
                          </span>
                        ))}
                      </span>
                    )}
                  </td>
                  <td className="text-end text-muted fs-xs">{c.items.length}</td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>
    </>
  );
};

export default CollectionsSection;
