import { ROUTE_PATHS } from '@/config/routePaths';
import { useAdminPlanMutations, useAdminPlansCatalog } from '@/hooks/useAdminPlans';
import { useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Col,
  Form,
  Modal,
  Row,
  Spinner,
  Table,
} from 'react-bootstrap';
import { useNavigate } from 'react-router';

const PlanMgmtPage = () => {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useAdminPlansCatalog();
  const { createProduct, updateProduct, createPrice } = useAdminPlanMutations();

  const [showProduct, setShowProduct] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const [priceModal, setPriceModal] = useState<{ productId: string; currency: string } | null>(null);
  const [amountMajor, setAmountMajor] = useState('');
  const [interval, setInterval] = useState<'month' | 'year'>('month');

  const catalog = data?.catalog ?? [];

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    createProduct.mutate(
      { name: name.trim(), description: description.trim() || undefined },
      {
        onSuccess: () => {
          setShowProduct(false);
          setName('');
          setDescription('');
          void refetch();
        },
      },
    );
  };

  const handleCreatePrice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!priceModal) return;
    const n = Number(amountMajor.replace(',', '.'));
    if (!Number.isFinite(n) || n <= 0) return;
    const unit_amount = Math.round(n * 100);
    createPrice.mutate(
      {
        productId: priceModal.productId,
        unit_amount,
        currency: priceModal.currency.toLowerCase(),
        interval,
      },
      {
        onSuccess: () => {
          setPriceModal(null);
          setAmountMajor('');
          void refetch();
        },
      },
    );
  };

  const toggleActive = (productId: string, active: boolean) => {
    updateProduct.mutate(
      { productId, body: { active: !active } },
      { onSuccess: () => void refetch() },
    );
  };

  if (isLoading) return <Spinner animation="border" />;
  if (error) return <p className="text-danger">{error.message}</p>;

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <p className="text-muted small mb-0">Products and prices (live Stripe catalog).</p>
        <Button size="sm" onClick={() => setShowProduct(true)}>
          New product
        </Button>
      </div>

      {catalog.map(({ product, prices }) => {
        const p = product as Record<string, unknown>;
        const pid = String(p.id ?? '');
        const active = p.active !== false;
        return (
          <Card key={pid} className="border shadow-none mb-3">
            <Card.Body>
              <div className="d-flex flex-wrap justify-content-between gap-2 mb-2">
                <div>
                  <h5 className="mb-1">{typeof p.name === 'string' ? p.name : pid}</h5>
                  <p className="text-muted small mb-0">{typeof p.description === 'string' ? p.description : ''}</p>
                </div>
                <div className="d-flex flex-wrap gap-2 align-items-start">
                  <Badge bg={active ? 'success' : 'secondary'}>{active ? 'Active' : 'Archived'}</Badge>
                  <Button size="sm" variant="outline-secondary" onClick={() => toggleActive(pid, active)}>
                    {active ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button size="sm" variant="outline-primary" onClick={() => navigate(ROUTE_PATHS.adminFinancePlanPath(pid))}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() =>
                      setPriceModal({
                        productId: pid,
                        currency: typeof p.default_price === 'string' ? 'eur' : 'eur',
                      })
                    }
                  >
                    Add price
                  </Button>
                </div>
              </div>
              <Table responsive size="sm" className="mb-0">
                <thead className="small text-muted">
                  <tr>
                    <th>Price id</th>
                    <th>Amount</th>
                    <th>Interval</th>
                    <th>Active</th>
                  </tr>
                </thead>
                <tbody>
                  {prices.map((raw) => {
                    const pr = raw as Record<string, unknown>;
                    const rec = pr.recurring as Record<string, unknown> | undefined;
                    return (
                      <tr key={String(pr.id)}>
                        <td>
                          <code className="small">{String(pr.id)}</code>
                        </td>
                        <td>
                          {typeof pr.unit_amount === 'number'
                            ? (pr.unit_amount / 100).toFixed(2)
                            : '—'}{' '}
                          <span className="text-uppercase">{String(pr.currency ?? '')}</span>
                        </td>
                        <td>{rec?.interval ? String(rec.interval) : '—'}</td>
                        <td>{pr.active === false ? 'No' : 'Yes'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        );
      })}

      <Modal show={showProduct} onHide={() => setShowProduct(false)} centered>
        <Form onSubmit={handleCreateProduct}>
          <Modal.Header closeButton>
            <Modal.Title>New product</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-2">
              <Form.Label>Name</Form.Label>
              <Form.Control value={name} onChange={(e) => setName(e.target.value)} required />
            </Form.Group>
            <Form.Group>
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light" type="button" onClick={() => setShowProduct(false)}>
              Close
            </Button>
            <Button type="submit" disabled={createProduct.isPending}>
              {createProduct.isPending ? 'Saving…' : 'Create'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={Boolean(priceModal)} onHide={() => setPriceModal(null)} centered>
        <Form onSubmit={handleCreatePrice}>
          <Modal.Header closeButton>
            <Modal.Title>Add recurring price</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Row className="g-2">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Amount (major units)</Form.Label>
                  <Form.Control
                    value={amountMajor}
                    onChange={(e) => setAmountMajor(e.target.value)}
                    placeholder="9.99"
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Interval</Form.Label>
                  <Form.Select value={interval} onChange={(e) => setInterval(e.target.value as 'month' | 'year')}>
                    <option value="month">Monthly</option>
                    <option value="year">Yearly</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Currency</Form.Label>
                  <Form.Control
                    value={priceModal?.currency ?? 'eur'}
                    onChange={(e) =>
                      setPriceModal((m) => (m ? { ...m, currency: e.target.value } : null))
                    }
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light" type="button" onClick={() => setPriceModal(null)}>
              Close
            </Button>
            <Button type="submit" disabled={createPrice.isPending}>
              {createPrice.isPending ? 'Creating…' : 'Create price'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default PlanMgmtPage;
