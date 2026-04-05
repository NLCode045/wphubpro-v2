import { DocHelpButton } from '@/components/docs/DocHelpButton';
import PageBreadcrumb from '@/components/PageBreadcrumb';
import type { SupportTicketCreateLocationState } from '@/config/supportTicketNavigation';
import { ROUTE_PATHS } from '@/config/routePaths';
import { useAuth } from '@/domains/auth';
import { useCreateTicket } from '@/domains/tickets';
import { useNotificationContext } from '@/context/useNotificationContext';
import type { SupportTicketCategory, TicketNotifyChannel } from '@/types';
import { type FormEvent, useMemo, useState } from 'react';
import { Button, Card, CardBody, CardHeader, Col, Container, Form, Row, Spinner } from 'react-bootstrap';
import { TbPlus, TbX } from 'react-icons/tb';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { SUPPORT_CATEGORY_LABELS } from '@/views/support/supportUi';

const CATEGORY_KEYS = Object.keys(SUPPORT_CATEGORY_LABELS) as SupportTicketCategory[];

export default function SupportTicketCreatePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { showNotification } = useNotificationContext();
  const create = useCreateTicket();

  const fromNav = (location.state ?? null) as SupportTicketCreateLocationState;

  const initialCategory = useMemo(() => {
    const q = searchParams.get('category') as SupportTicketCategory | null;
    if (q && SUPPORT_CATEGORY_LABELS[q]) return q;
    return fromNav?.category && SUPPORT_CATEGORY_LABELS[fromNav.category] ? fromNav.category : 'other';
  }, [fromNav?.category, searchParams]);

  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<SupportTicketCategory>(initialCategory);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [notifyChannel, setNotifyChannel] = useState<TicketNotifyChannel>('platform');

  const contextPayload = useMemo(() => {
    const base = fromNav?.context ?? {};
    return Object.keys(base).length > 0 ? { ...base } : undefined;
  }, [fromNav?.context]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!user || !subject.trim()) return;
    create.mutate(
      {
        subject: subject.trim(),
        body: description.trim() || undefined,
        category,
        priority,
        notifyChannel,
        context: contextPayload
          ? {
              sourcePath: contextPayload.sourcePath || `${location.pathname}${location.search}`,
              ...contextPayload,
            }
          : { sourcePath: `${location.pathname}${location.search}` },
      },
      {
        onSuccess: (res) => {
          const id = (res as { ticket?: { $id?: string } })?.ticket?.$id;
          showNotification({
            title: 'Ticket created',
            message: 'We will get back to you as soon as possible.',
            variant: 'success',
            delay: 4000,
          });
          if (id) {
            navigate(ROUTE_PATHS.supportTicketPath(id), { replace: true });
          } else {
            navigate(ROUTE_PATHS.SUPPORT, { replace: true });
          }
        },
        onError: (err) => {
          showNotification({
            title: 'Could not create ticket',
            message: err instanceof Error ? err.message : 'Please try again.',
            variant: 'danger',
            delay: 6000,
          });
        },
      }
    );
  };

  if (!user) {
    return null;
  }

  return (
    <>
      <Container fluid>
        <PageBreadcrumb title="New ticket" subtitle="Support" titleEnd={<DocHelpButton contextKey="support:new" />} />
        <Row className="justify-content-center">
          <Col xxl={10}>
            <Card>
              <CardHeader>
                <h5 className="mb-0">Create support ticket</h5>
              </CardHeader>
              <form onSubmit={handleSubmit}>
                <CardBody>
                  <Form.Group className="mb-3">
                    <Form.Label>Subject</Form.Label>
                    <Form.Control
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Short summary"
                      required
                    />
                  </Form.Group>
                  <Row className="mb-3">
                    <Col md={6}>
                      <Form.Label>Category</Form.Label>
                      <Form.Select value={category} onChange={(e) => setCategory(e.target.value as SupportTicketCategory)}>
                        {CATEGORY_KEYS.map((k) => (
                          <option key={k} value={k}>
                            {SUPPORT_CATEGORY_LABELS[k]}
                          </option>
                        ))}
                      </Form.Select>
                    </Col>
                    <Col md={6}>
                      <Form.Label>Priority</Form.Label>
                      <Form.Select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value as typeof priority)}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </Form.Select>
                    </Col>
                  </Row>
                  <Form.Group className="mb-3">
                    <Form.Label>Updates via</Form.Label>
                    <div>
                      <Form.Check
                        inline
                        type="radio"
                        name="notify"
                        id="notify-platform"
                        label="Platform notification"
                        checked={notifyChannel === 'platform'}
                        onChange={() => setNotifyChannel('platform')}
                      />
                      <Form.Check
                        inline
                        type="radio"
                        name="notify"
                        id="notify-email"
                        label="Email"
                        checked={notifyChannel === 'email'}
                        onChange={() => setNotifyChannel('email')}
                      />
                    </div>
                    <Form.Text className="text-muted">
                      Email delivery uses your project&apos;s outbound configuration when a webhook is set on the tickets
                      function (<code>SUPPORT_NOTIFY_EMAIL_WEBHOOK</code>).
                    </Form.Text>
                  </Form.Group>
                  <Form.Group className="mb-4">
                    <Form.Label>Description</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={5}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="What happened? What did you expect?"
                    />
                  </Form.Group>
                  {contextPayload && Object.keys(contextPayload).length > 0 ? (
                    <div className="mb-4 p-3 rounded border bg-light-subtle">
                      <h6 className="text-uppercase text-muted fs-xs mb-2">Context from this page</h6>
                      <ul className="mb-0 small text-muted">
                        {contextPayload.sourcePath ? <li>Path: {contextPayload.sourcePath}</li> : null}
                        {contextPayload.sourceLabel ? <li>{contextPayload.sourceLabel}</li> : null}
                        {contextPayload.siteId ? <li>Site ID: {contextPayload.siteId}</li> : null}
                        {contextPayload.subscriptionId ? <li>Subscription: {contextPayload.subscriptionId}</li> : null}
                      </ul>
                    </div>
                  ) : null}
                  <div className="d-flex gap-2 justify-content-center flex-wrap">
                    <Button type="submit" variant="primary" disabled={create.isPending}>
                      {create.isPending ? (
                        <>
                          <Spinner size="sm" className="me-1" /> Submitting…
                        </>
                      ) : (
                        <>
                          <TbPlus className="me-1" /> Submit ticket
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline-secondary"
                      onClick={() => navigate(ROUTE_PATHS.SUPPORT)}
                      disabled={create.isPending}
                    >
                      <TbX className="me-1" />
                      Cancel
                    </Button>
                  </div>
                </CardBody>
              </form>
            </Card>
          </Col>
        </Row>
      </Container>
    </>
  );
}
