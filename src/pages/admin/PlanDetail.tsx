import { ROUTE_PATHS } from '@/config/routePaths';
import { useAdminPlanMutations, useAdminPlansCatalog } from '@/hooks/useAdminPlans';
import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import { Link, useParams } from 'react-router';

const PlanDetailPage = () => {
  const { productId } = useParams<{ productId: string }>();
  const { data, isLoading, error, refetch } = useAdminPlansCatalog();
  const { updateProduct, createPrice } = useAdminPlanMutations();

  const entry = useMemo(() => {
    const catalog = data?.catalog ?? [];
    return catalog.find((c) => String((c.product as Record<string, unknown>).id) === productId);
  }, [data?.catalog, productId]);

  const product = entry?.product as Record<string, unknown> | undefined;
  const prices = entry?.prices ?? [];

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [amountMajor, setAmountMajor] = useState('');
  const [interval, setInterval] = useState<'month' | 'year'>('month');
  const [currency, setCurrency] = useState('eur');

  useEffect(() => {
    if (!product) return;
    setName(typeof product.name === 'string' ? product.name : '');
    setDescription(typeof product.description === 'string' ? product.description : '');
  }, [product]);

  if (!productId) return <p className="text-danger">Missing product id.</p>;
  if (isLoading) return <Spinner animation="border" />;
  if (error) return <p className="text-danger">{error.message}</p>;
  if (!product) {
    return (
      <p>
        Product not found in catalog. <Link to={ROUTE_PATHS.ADMIN_FINANCE_PLANS}>Back to plans</Link>
      </p>
    );
  }

  const pid = String(product.id);

  const saveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    updateProduct.mutate(
      { productId: pid, body: { name: name.trim(), description: description.trim() || undefined } },
      { onSuccess: () => void refetch() },
    );
  };

  const addPrice = (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(amountMajor.replace(',', '.'));
    if (!Number.isFinite(n) || n <= 0) return;
    createPrice.mutate(
      {
        productId: pid,
        unit_amount: Math.round(n * 100),
        currency: currency.toLowerCase(),
        interval,
      },
      {
        onSuccess: () => {
          setAmountMajor('');
          void refetch();
        },
      },
    );
  };

  return (
    <div>
      <div className="mb-3">
        <Link to={ROUTE_PATHS.ADMIN_FINANCE_PLANS} className="small">
          ← Plans
        </Link>
      </div>
      <Row className="g-3">
        <Col lg={6}>
          <Card className="border shadow-none">
            <Card.Body>
              <h5 className="mb-3">Edit product</h5>
              <Form onSubmit={saveProduct}>
                <Form.Group className="mb-2">
                  <Form.Label>Name</Form.Label>
                  <Form.Control value={name} onChange={(e) => setName(e.target.value)} required />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Description</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </Form.Group>
                <Button type="submit" size="sm" disabled={updateProduct.isPending}>
                  {updateProduct.isPending ? 'Saving…' : 'Save'}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={6}>
          <Card className="border shadow-none">
            <Card.Body>
              <h5 className="mb-3">Add price</h5>
              <Form onSubmit={addPrice}>
                <Row className="g-2">
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>Amount</Form.Label>
                      <Form.Control value={amountMajor} onChange={(e) => setAmountMajor(e.target.value)} required />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>Currency</Form.Label>
                      <Form.Control value={currency} onChange={(e) => setCurrency(e.target.value)} />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>Interval</Form.Label>
                      <Form.Select value={interval} onChange={(e) => setInterval(e.target.value as 'month' | 'year')}>
                        <option value="month">Monthly</option>
                        <option value="year">Yearly</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>
                <Button type="submit" size="sm" className="mt-2" disabled={createPrice.isPending}>
                  {createPrice.isPending ? 'Adding…' : 'Add price'}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="border shadow-none mt-3">
        <Card.Body>
          <h6 className="mb-3">Prices</h6>
          <Table responsive size="sm" className="mb-0">
            <thead className="small text-muted">
              <tr>
                <th>Id</th>
                <th>Amount</th>
                <th>Interval</th>
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
                      {typeof pr.unit_amount === 'number' ? (pr.unit_amount / 100).toFixed(2) : '—'}{' '}
                      <span className="text-uppercase">{String(pr.currency ?? '')}</span>
                    </td>
                    <td>{rec?.interval ? String(rec.interval) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </div>
  );
};

export default PlanDetailPage;
