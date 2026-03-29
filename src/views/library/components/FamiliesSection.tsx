import type { LibraryFamily } from '@/types'
import { useMemo } from 'react'
import { Card, CardBody, Col, Row, Table } from 'react-bootstrap'
import { LuSearch } from 'react-icons/lu'
import type { LibraryViewMode } from './ViewModeToggle'

type FamiliesSectionProps = {
  families: LibraryFamily[];
  view: LibraryViewMode;
  search: string;
  onSearchChange: (v: string) => void;
};

const FamiliesSection = ({ families, view, search, onSearchChange }: FamiliesSectionProps) => {
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return families;
    return families.filter(
      (f) =>
        (f.name || '').toLowerCase().includes(q) ||
        f.memberSlugs.some((s) => s.toLowerCase().includes(q)),
    );
  }, [families, search]);

  const searchBar = (
    <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
      <div className="app-search flex-grow-1" style={{ minWidth: '12rem', maxWidth: '28rem' }}>
        <input
          type="search"
          className="form-control"
          placeholder="Search families…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search families"
        />
        <LuSearch className="app-search-icon text-muted" />
      </div>
    </div>
  );

  if (families.length === 0) {
    return (
      <>
        {searchBar}
        <p className="text-muted text-center py-5 mb-0">No item families yet.</p>
      </>
    );
  }

  if (view === 'grid') {
    return (
      <>
        {searchBar}
        {filtered.length === 0 ? (
          <p className="text-muted text-center py-5 mb-0">No families match your search.</p>
        ) : (
          <Row className="g-3">
            {filtered.map((f) => (
              <Col key={f.$id} xs={12} sm={6} xl={4}>
                <Card className="h-100 shadow-sm">
                  <CardBody>
                    <h6 className="mb-2 text-truncate" title={f.name || 'Family'}>
                      {f.name || '—'}
                    </h6>
                    <p className="text-muted fs-xs mb-2">
                      {f.memberSlugs.length} member{f.memberSlugs.length === 1 ? '' : 's'}
                    </p>
                    <div className="d-flex flex-wrap gap-1">
                      {f.memberSlugs.length === 0 ? (
                        <span className="text-muted fs-xs">No members yet</span>
                      ) : (
                        f.memberSlugs.map((s) => (
                          <span key={s} className="badge badge-soft-secondary fs-xxs">
                            {s}
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
              <th>Members</th>
              <th className="text-end">Count</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-center text-muted py-4">
                  No families match your search.
                </td>
              </tr>
            ) : (
              filtered.map((f) => (
                <tr key={f.$id}>
                  <td className="fw-medium">{f.name || '—'}</td>
                  <td>
                    {f.memberSlugs.length === 0 ? (
                      <span className="text-muted fs-xs">—</span>
                    ) : (
                      <span className="d-flex flex-wrap gap-1">
                        {f.memberSlugs.map((s) => (
                          <span key={s} className="badge badge-soft-secondary fs-xxs">
                            {s}
                          </span>
                        ))}
                      </span>
                    )}
                  </td>
                  <td className="text-end text-muted fs-xs">{f.memberSlugs.length}</td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>
    </>
  );
};

export default FamiliesSection;
