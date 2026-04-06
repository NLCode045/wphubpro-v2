import { DocHelpButton } from '@/components/docs/DocHelpButton';
import PageBreadcrumb from '@/components/PageBreadcrumb';
import { ROUTE_PATHS } from '@/config/routePaths';
import { useEffectiveIsAdmin } from '@/context/useEffectiveIsAdmin';
import { useAuth } from '@/domains/auth';
import {
  useSetTicketFollow,
  useTicket,
  useTicketAssignableAgents,
  useUpdateTicket,
  useUpdateTicketStatus,
} from '@/domains/tickets';
import { useNotificationContext } from '@/context/useNotificationContext';
import type { SupportTicketContext, Ticket, TicketActivity, TicketStatus } from '@/types';
import { useEffect, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Col,
  Container,
  Form,
  Row,
  Spinner,
} from 'react-bootstrap';
import { TbArrowLeft, TbBell, TbBellOff } from 'react-icons/tb';
import { Link, useParams } from 'react-router';
import { SupportTicketChatCard } from '@/views/support/SupportTicketChatCard';
import {
  categoryLabel,
  formatPriority,
  formatTicketStatus,
  priorityBadgeClass,
  statusBadgeClass,
} from '@/views/support/supportUi';

function ContextBlock({ context, isAdmin }: { context: SupportTicketContext | null; isAdmin: boolean }) {
  if (!context || Object.keys(context).length === 0) return null;
  return (
    <Card className="mb-3">
      <CardHeader>
        <h6 className="mb-0">Related context</h6>
      </CardHeader>
      <CardBody className="small">
        <dl className="row mb-0">
          {context.sourcePath ? (
            <>
              <dt className="col-sm-3">Page</dt>
              <dd className="col-sm-9">
                <code className="small">{context.sourcePath}</code>
              </dd>
            </>
          ) : null}
          {context.sourceLabel ? (
            <>
              <dt className="col-sm-3">Label</dt>
              <dd className="col-sm-9">{context.sourceLabel}</dd>
            </>
          ) : null}
          {context.siteId ? (
            <>
              <dt className="col-sm-3">Site</dt>
              <dd className="col-sm-9">
                <Link to={ROUTE_PATHS.siteDetailPath(context.siteId)}>
                  {context.siteName || context.siteId}
                </Link>
              </dd>
            </>
          ) : null}
          {context.pluginId && context.siteId ? (
            <>
              <dt className="col-sm-3">Plugin</dt>
              <dd className="col-sm-9">
                <Link to={ROUTE_PATHS.sitePluginDetailPath(context.siteId, context.pluginId)}>
                  {context.pluginId}
                </Link>
              </dd>
            </>
          ) : null}
          {context.themeId && context.siteId ? (
            <>
              <dt className="col-sm-3">Theme</dt>
              <dd className="col-sm-9">
                <Link to={ROUTE_PATHS.siteThemeDetailPath(context.siteId, context.themeId)}>
                  {context.themeId}
                </Link>
              </dd>
            </>
          ) : null}
          {context.libraryItemKind && context.libraryItemSlug ? (
            <>
              <dt className="col-sm-3">Library item</dt>
              <dd className="col-sm-9">
                <Link to={ROUTE_PATHS.libraryItemDetailPath(context.libraryItemKind, context.libraryItemSlug)}>
                  {context.libraryItemKind}/{context.libraryItemSlug}
                </Link>
              </dd>
            </>
          ) : null}
          {context.subscriptionId ? (
            <>
              <dt className="col-sm-3">Subscription</dt>
              <dd className="col-sm-9">
                <code>{context.subscriptionId}</code>
                {isAdmin ? (
                  <>
                    {' '}
                    <Link to={ROUTE_PATHS.adminFinanceSubscriptionPath(context.subscriptionId)}>(admin)</Link>
                  </>
                ) : (
                  <>
                    {' '}
                    <Link to={`${ROUTE_PATHS.PROFILE}?tab=subscription`}>(your billing)</Link>
                  </>
                )}
              </dd>
            </>
          ) : null}
          {context.invoiceId ? (
            <>
              <dt className="col-sm-3">Invoice</dt>
              <dd className="col-sm-9">
                <code>{context.invoiceId}</code>
              </dd>
            </>
          ) : null}
          {context.paymentIntentId && isAdmin ? (
            <>
              <dt className="col-sm-3">Payment</dt>
              <dd className="col-sm-9">
                <Link to={ROUTE_PATHS.adminFinancePaymentPath(context.paymentIntentId)}>
                  {context.paymentIntentId}
                </Link>
              </dd>
            </>
          ) : null}
        </dl>
      </CardBody>
    </Card>
  );
}

function ActivityTimeline({ activities }: { activities: TicketActivity[] }) {
  return (
    <div className="mb-4">
      <h6 className="text-uppercase text-muted mb-3">Action history</h6>
      <div className="timeline">
        {[...activities].reverse().map((a) => {
          const t = new Date(a.$createdAt);
          return (
            <div key={a.$id} className="timeline-item d-flex align-items-stretch">
              <div className="timeline-time pe-3 text-muted text-nowrap small">
                {t.toLocaleString()}
              </div>
              <div className="timeline-dot bg-secondary" />
              <div className="timeline-content ps-3 pb-3">
                <h6 className="mb-1 fs-sm">{a.summary}</h6>
                {a.detailJson ? (
                  <p className="mb-0 text-muted fs-xs font-monospace">{a.detailJson}</p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SupportTicketDetailPage() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const { user } = useAuth();
  const effectiveAdmin = useEffectiveIsAdmin();
  const { showNotification } = useNotificationContext();
  const q = useTicket(ticketId);
  const updateTicket = useUpdateTicket();
  const updateStatusOnly = useUpdateTicketStatus();
  const setFollow = useSetTicketFollow();

  const { data: assignableAgents = [] } = useTicketAssignableAgents();

  const [admStatus, setAdmStatus] = useState<TicketStatus>('open');
  const [admPriority, setAdmPriority] = useState<Ticket['priority']>('medium');
  const [admAssignee, setAdmAssignee] = useState<string>('');

  const ticket = q.data?.ticket;
  const messages = q.data?.messages ?? [];
  const activities = q.data?.activities ?? [];
  const reporter = q.data?.reporter;
  const assignee = q.data?.assignee;
  const context = q.data?.context ?? null;
  const iFollow = q.data?.iFollow ?? false;
  const recentFromReporter = q.data?.recentFromReporter ?? [];

  useEffect(() => {
    if (!ticket) return;
    setAdmStatus(ticket.status);
    setAdmPriority(ticket.priority);
    setAdmAssignee(ticket.assignedToUserId ?? '');
  }, [ticket?.$id, ticket?.status, ticket?.priority, ticket?.assignedToUserId]);

  const applyAdminPatch = () => {
    if (!ticketId || !ticket) return;
    const curAssign = ticket.assignedToUserId ?? '';
    const changed =
      admStatus !== ticket.status ||
      admPriority !== ticket.priority ||
      (admAssignee || '') !== (curAssign || '');
    if (!changed) {
      showNotification({ title: 'No changes', message: 'Update status, priority, or assignee first.', variant: 'light', delay: 3000 });
      return;
    }
    // Always send status (required by older ticket functions); server applies only changed fields.
    updateTicket.mutate(
      {
        ticketId,
        status: admStatus,
        priority: admPriority,
        assignedToUserId: admAssignee || null,
      },
      {
        onSuccess: () =>
          showNotification({ title: 'Saved', message: 'Ticket updated.', variant: 'success', delay: 3000 }),
        onError: (e) =>
          showNotification({
            title: 'Update failed',
            message: e instanceof Error ? e.message : 'Try again.',
            variant: 'danger',
            delay: 5000,
          }),
      },
    );
  };

  const quickClose = () => {
    if (!ticketId) return;
    updateStatusOnly.mutate(
      { ticketId, status: 'closed' },
      {
        onSuccess: () =>
          showNotification({ title: 'Closed', message: 'Ticket marked closed.', variant: 'success', delay: 3000 }),
      }
    );
  };

  const toggleFollow = () => {
    if (!ticketId) return;
    setFollow.mutate(
      { ticketId, follow: !iFollow },
      {
        onError: (e) =>
          showNotification({
            title: 'Follow failed',
            message: e instanceof Error ? e.message : 'Schema may need migration (follower_ids).',
            variant: 'danger',
            delay: 6000,
          }),
      }
    );
  };

  if (!user) {
    return null;
  }

  if (q.isLoading) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Ticket" subtitle="Support" titleEnd={<DocHelpButton contextKey="support:ticket" />} />
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      </Container>
    );
  }

  if (q.isError || !ticket) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Ticket" subtitle="Support" titleEnd={<DocHelpButton contextKey="support:ticket" />} />
        <Card className="mt-3">
          <CardBody>Could not load this ticket.</CardBody>
        </Card>
      </Container>
    );
  }

  const isOwner = user.$id === ticket.userId;
  const showFollow = !isOwner;

  return (
    <>
      <Container fluid>
        <PageBreadcrumb title={ticket.subject} subtitle="Support" titleEnd={<DocHelpButton contextKey="support:ticket" />} />
        <Row>
          <Col xxl={8}>
            <Card className="mb-3">
              <CardHeader className="justify-content-between flex-wrap gap-2">
                <div>
                  <h5 className="mb-1">
                    <span className="text-muted small me-2">#{ticket.$id.slice(0, 8)}…</span>
                    {ticket.subject}
                  </h5>
                  <div className="d-flex flex-wrap gap-2 align-items-center">
                    <Badge className={statusBadgeClass(ticket.status)}>{formatTicketStatus(ticket.status)}</Badge>
                    <Badge className={priorityBadgeClass(ticket.priority)}>{formatPriority(ticket.priority)}</Badge>
                    <span className="text-muted small">Category: {categoryLabel(ticket.category)}</span>
                  </div>
                </div>
                <div className="d-flex flex-wrap gap-2">
                  {showFollow ? (
                    <Button
                      variant={iFollow ? 'outline-secondary' : 'outline-primary'}
                      size="sm"
                      onClick={toggleFollow}
                      disabled={setFollow.isPending}
                    >
                      {iFollow ? (
                        <>
                          <TbBellOff className="me-1" /> Unfollow
                        </>
                      ) : (
                        <>
                          <TbBell className="me-1" /> Follow
                        </>
                      )}
                    </Button>
                  ) : (
                    <span className="text-muted small align-self-center">You will receive all updates on this ticket.</span>
                  )}
                </div>
              </CardHeader>
              <CardBody>
                <Row className="mb-3">
                  <Col md={6}>
                    <h6 className="text-uppercase text-muted fs-xs">User</h6>
                    {reporter ? (
                      <div>
                        <div className="fw-medium">
                          {effectiveAdmin ? (
                            <Link to={ROUTE_PATHS.adminUserPath(reporter.id)}>{reporter.name || '—'}</Link>
                          ) : user.$id === reporter.id ? (
                            <Link to={ROUTE_PATHS.PROFILE}>{reporter.name || '—'}</Link>
                          ) : (
                            reporter.name || '—'
                          )}
                        </div>
                        <div className="text-muted small">{reporter.email || reporter.id}</div>
                      </div>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </Col>
                  <Col md={6}>
                    <h6 className="text-uppercase text-muted fs-xs">Assigned to</h6>
                    {assignee ? (
                      <div>
                        <div className="fw-medium">
                          {effectiveAdmin ? (
                            <Link to={ROUTE_PATHS.adminUserPath(assignee.id)}>{assignee.name || '—'}</Link>
                          ) : (
                            assignee.name || '—'
                          )}
                        </div>
                        <div className="text-muted small">{assignee.email || assignee.id}</div>
                      </div>
                    ) : (
                      <span className="text-muted">Unassigned</span>
                    )}
                  </Col>
                </Row>
                <Row className="mb-3 text-muted small">
                  <Col md={6}>
                    <strong className="text-body">Created</strong> {new Date(ticket.$createdAt).toLocaleString()}
                  </Col>
                  <Col md={6}>
                    <strong className="text-body">Last updated</strong> {new Date(ticket.$updatedAt).toLocaleString()}
                  </Col>
                </Row>
                <p className="text-muted small mb-2">
                  Notifications:{' '}
                  <strong>
                    {ticket.notifyChannel === 'email'
                      ? 'Email'
                      : ticket.notifyChannel === 'both'
                        ? 'Both'
                        : 'Platform'}
                  </strong>
                </p>

                <ContextBlock context={context} isAdmin={effectiveAdmin} />

                {effectiveAdmin ? (
                  <Card className="mb-3 border-primary border-opacity-25">
                    <CardHeader>
                      <h6 className="mb-0">Admin</h6>
                    </CardHeader>
                    <CardBody>
                      <Row className="g-2 mb-3">
                        <Col md={4}>
                          <Form.Label className="small">Status</Form.Label>
                          <Form.Select
                            size="sm"
                            value={admStatus}
                            onChange={(e) => setAdmStatus(e.target.value as TicketStatus)}
                          >
                            <option value="open">Open</option>
                            <option value="in_progress">In progress</option>
                            <option value="waiting">Waiting</option>
                            <option value="resolved">Resolved</option>
                            <option value="closed">Closed</option>
                          </Form.Select>
                        </Col>
                        <Col md={4}>
                          <Form.Label className="small">Priority</Form.Label>
                          <Form.Select
                            size="sm"
                            value={admPriority}
                            onChange={(e) => setAdmPriority(e.target.value as Ticket['priority'])}
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                          </Form.Select>
                        </Col>
                        <Col md={4}>
                          <Form.Label className="small">Assign to admin</Form.Label>
                          <Form.Select
                            size="sm"
                            value={admAssignee}
                            onChange={(e) => setAdmAssignee(e.target.value)}
                          >
                            <option value="">— Unassigned —</option>
                            {assignableAgents.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.name ? `${u.name} (${u.email || u.id})` : u.email || u.id}
                              </option>
                            ))}
                          </Form.Select>
                        </Col>
                      </Row>
                      <div className="d-flex flex-wrap gap-2">
                        <Button size="sm" variant="primary" onClick={applyAdminPatch} disabled={updateTicket.isPending}>
                          {updateTicket.isPending ? 'Saving…' : 'Apply changes'}
                        </Button>
                        <Button size="sm" variant="outline-danger" onClick={quickClose} disabled={updateStatusOnly.isPending}>
                          Close ticket
                        </Button>
                      </div>
                    </CardBody>
                  </Card>
                ) : null}

                <ActivityTimeline activities={activities} />

                <div className="d-flex flex-wrap gap-2 justify-content-center">
                  <Link to={ROUTE_PATHS.SUPPORT} className="btn btn-outline-secondary">
                    <TbArrowLeft className="me-1" /> Back to list
                  </Link>
                  {effectiveAdmin ? (
                    <Link to={ROUTE_PATHS.ADMIN_SUPPORT} className="btn btn-outline-primary">
                      Admin queue
                    </Link>
                  ) : null}
                </div>
              </CardBody>
            </Card>
          </Col>
          <Col xxl={4}>
            <SupportTicketChatCard
              ticketId={ticket.$id}
              messages={messages}
              recentFromReporter={recentFromReporter}
              showRecentFromUser={effectiveAdmin}
            />
          </Col>
        </Row>
      </Container>
    </>
  );
}
