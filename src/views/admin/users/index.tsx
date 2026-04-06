import { DocHelpButton } from '@/components/docs/DocHelpButton';
import PageBreadcrumb from '@/components/PageBreadcrumb.tsx';
import PageMetaData from '@/components/PageMetaData';
import { ROUTE_PATHS } from '@/config/routePaths';
import { useDashboardNav } from '@/context/DashboardNavContext';
import { useNotificationContext } from '@/context/useNotificationContext';
import { useAuth } from '@/domains/auth';
import {
  useAdminUsersList,
  type AdminUser,
  type AdminUserPlanFilter,
  type AdminUserRoleFilter,
  type AdminUserStatusFilter,
} from '@/domains/admin/useAdminUsers';
import AdminUserCard from '@/views/admin/users/AdminUserCard';
import AdminUsersTable from '@/views/admin/users/AdminUsersTable';
import EditAdminUserModal from '@/views/admin/users/EditAdminUserModal';
import ViewModeToggle, {
  type LibraryViewMode,
} from '@/views/library/components/ViewModeToggle';
import { useCallback, useEffect, useState } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import {
  Button,
  Card,
  Col,
  Container,
  Form,
  Pagination,
  Row,
  Spinner,
} from 'react-bootstrap';
import { LuSearch } from 'react-icons/lu';
import { useNavigate } from 'react-router';

const PER_PAGE_OPTIONS = [12, 24, 48] as const;

const AdminUsersOverviewPage = () => {
  const { isAdmin, user: sessionUser, startImpersonation } = useAuth();
  const { mode, setMode } = useDashboardNav();
  const navigate = useNavigate();
  const { showNotification } = useNotificationContext();

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState<number>(12);
  const [statusFilter, setStatusFilter] = useState<AdminUserStatusFilter>('all');
  const [roleFilter, setRoleFilter] = useState<AdminUserRoleFilter>('all');
  const [planFilter, setPlanFilter] = useState<AdminUserPlanFilter>('all');

  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [viewMode, setViewMode] = useLocalStorage<LibraryViewMode>('admin-users-view', 'grid');

  useEffect(() => {
    if (!isAdmin) {
      navigate(ROUTE_PATHS.DASHBOARD, { replace: true });
      return;
    }
    if (mode !== 'admin') {
      navigate(ROUTE_PATHS.DASHBOARD, { replace: true });
    }
  }, [isAdmin, mode, navigate]);

  const { data, isLoading, isError, error, refetch } = useAdminUsersList({
    limit,
    offset: page * limit,
    search,
    status: statusFilter,
    role: roleFilter,
    plan: planFilter,
  });

  const [impersonateBusyId, setImpersonateBusyId] = useState<string | null>(null);

  const handleSearch = useCallback(() => {
    setSearch(searchInput.trim());
    setPage(0);
  }, [searchInput]);

  const users: AdminUser[] = data?.users ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  useEffect(() => {
    setPage((p) => Math.min(p, Math.max(0, totalPages - 1)));
  }, [totalPages]);

  const handleImpersonate = async (userId: string) => {
    if (sessionUser?.$id === userId) {
      showNotification({
        title: 'Already this user',
        message: 'You are already signed in as this account.',
        variant: 'primary',
      });
      return;
    }
    try {
      setImpersonateBusyId(userId);
      await startImpersonation(userId);
      setMode('user');
      navigate(ROUTE_PATHS.DASHBOARD, { replace: true });
      showNotification({
        title: 'Viewing as user',
        message: 'You are browsing the platform as this account. Use the top bar to stop.',
        variant: 'success',
      });
    } catch (err) {
      showNotification({
        title: 'Impersonation failed',
        message:
          err instanceof Error
            ? err.message
            : 'Could not start impersonation. Ensure your Appwrite account has the impersonator capability enabled.',
        variant: 'danger',
      });
    } finally {
      setImpersonateBusyId(null);
    }
  };

  if (!isAdmin || mode !== 'admin') {
    return null;
  }

  return (
    <>
      <PageMetaData title="Users · Admin" />
      <Container fluid>
        <PageBreadcrumb
          title="Users"
          subtitle="Admin · members overview"
          titleEnd={<DocHelpButton contextKey="admin:users" />}
        />

        <EditAdminUserModal
          user={editUser}
          show={editOpen}
          onHide={() => {
            setEditOpen(false);
            setEditUser(null);
          }}
          onSaved={() => refetch()}
        />

        <Row className="mb-3">
          <Col lg={12}>
            <Card className="border">
              <Card.Body className="p-3">
                <Row className="g-3 align-items-end">
                  <Col md={5} lg={4}>
                    <Form.Label className="small text-muted mb-1 d-block">Search</Form.Label>
                    <div className="app-search">
                      <input
                        type="search"
                        className="form-control"
                        placeholder="Search name or email…"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        aria-label="Search users"
                      />
                      <LuSearch className="app-search-icon text-muted" />
                    </div>
                  </Col>
                  <Col md="auto">
                    <Button variant="primary" type="button" onClick={handleSearch}>
                      Search
                    </Button>
                  </Col>
                  <Col xs={6} sm={4} md="auto">
                    <Form.Label className="small text-muted mb-1 d-block">Status</Form.Label>
                    <Form.Select
                      value={statusFilter}
                      onChange={(e) => {
                        setStatusFilter(e.target.value as AdminUserStatusFilter);
                        setPage(0);
                      }}
                      aria-label="Filter by status"
                    >
                      <option value="all">All</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </Form.Select>
                  </Col>
                  <Col xs={6} sm={4} md="auto">
                    <Form.Label className="small text-muted mb-1 d-block">Role</Form.Label>
                    <Form.Select
                      value={roleFilter}
                      onChange={(e) => {
                        setRoleFilter(e.target.value as AdminUserRoleFilter);
                        setPage(0);
                      }}
                      aria-label="Filter by role"
                    >
                      <option value="all">All</option>
                      <option value="admin">Admin</option>
                      <option value="user">User</option>
                    </Form.Select>
                  </Col>
                  <Col xs={6} sm={4} md="auto">
                    <Form.Label className="small text-muted mb-1 d-block">Plan</Form.Label>
                    <Form.Select
                      value={planFilter}
                      onChange={(e) => {
                        setPlanFilter(e.target.value as AdminUserPlanFilter);
                        setPage(0);
                      }}
                      aria-label="Filter by plan"
                    >
                      <option value="all">All</option>
                      <option value="free">Free</option>
                      <option value="stripe">Stripe</option>
                    </Form.Select>
                  </Col>
                  <Col md="auto" className="ms-md-auto d-flex flex-column align-items-md-end">
                    <Form.Label className="small text-muted mb-1 d-block w-100 text-md-end">View</Form.Label>
                    <ViewModeToggle value={viewMode} onChange={setViewMode} idPrefix="admin-users" />
                  </Col>
                  <Col md="auto">
                    <Form.Label className="small text-muted mb-1 d-block">Per page</Form.Label>
                    <Form.Select
                      value={limit}
                      onChange={(e) => {
                        setLimit(Number(e.target.value));
                        setPage(0);
                      }}
                      style={{ minWidth: '5.5rem' }}
                      aria-label="Users per page"
                    >
                      {PER_PAGE_OPTIONS.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </Form.Select>
                  </Col>
                </Row>

                <hr className="border-dashed my-3" />

                {isLoading && (
                  <div className="d-flex justify-content-center py-5">
                    <Spinner animation="border" variant="primary" role="status">
                      <span className="visually-hidden">Loading…</span>
                    </Spinner>
                  </div>
                )}

                {isError && (
                  <p className="text-danger small mb-0">
                    {error instanceof Error ? error.message : 'Could not load users.'}
                  </p>
                )}

                {!isLoading && !isError && users.length === 0 && (
                  <p className="text-muted text-center py-5 mb-0">No users match your filters.</p>
                )}

                {!isLoading && !isError && users.length > 0 && (
                  <>
                    {viewMode === 'table' ? (
                      <AdminUsersTable
                        users={users}
                        onEdit={(user) => {
                          setEditUser(user);
                          setEditOpen(true);
                        }}
                        onImpersonate={handleImpersonate}
                        impersonateBusyId={impersonateBusyId}
                      />
                    ) : (
                      <Row>
                        {users.map((u) => (
                          <Col xxl={3} md={6} key={u.id} className="mb-3">
                            <AdminUserCard
                              user={u}
                              onEdit={(user) => {
                                setEditUser(user);
                                setEditOpen(true);
                              }}
                              onImpersonate={handleImpersonate}
                              impersonateBusyId={impersonateBusyId}
                            />
                          </Col>
                        ))}
                      </Row>
                    )}

                    <div className="d-flex flex-column flex-sm-row align-items-center justify-content-between gap-2 mt-3 pt-2 border-top border-dashed">
                      <span className="text-muted small">
                        Showing {total === 0 ? 0 : page * limit + 1}–{Math.min((page + 1) * limit, total)} of{' '}
                        {total}
                      </span>
                      {totalPages > 1 && (
                        <Pagination className="pagination-rounded pagination-boxed mb-0 flex-wrap justify-content-center">
                          <Pagination.Prev disabled={page <= 0} onClick={() => setPage((p) => Math.max(0, p - 1))} />
                          {Array.from({ length: totalPages }, (_, i) => (
                            <Pagination.Item key={i} active={i === page} onClick={() => setPage(i)}>
                              {i + 1}
                            </Pagination.Item>
                          ))}
                          <Pagination.Next
                            disabled={page >= totalPages - 1}
                            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                          />
                        </Pagination>
                      )}
                    </div>
                  </>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </>
  );
};

export default AdminUsersOverviewPage;
