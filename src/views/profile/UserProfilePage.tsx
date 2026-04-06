import { DocHelpButton } from '@/components/docs/DocHelpButton';
import PageBreadcrumb from '@/components/PageBreadcrumb.tsx';
import { ContactSupportButton } from '@/components/support/ContactSupportButton';
import { TabNavLabel } from '@/components/TabNavLabel';
import { useAuth } from '@/domains/auth';
import type { DocsHelpContextKey } from '@/domains/docs/docsHelpMap';
import { USER_PROFILE_TAB_CONFIG } from '@/views/profile/userProfileNavTabs';
import UserProfileSidebarCard from '@/views/profile/UserProfileSidebarCard';
import UserProfileAccountSettingsTab from '@/views/profile/tabs/UserProfileAccountSettingsTab';
import UserProfileNotificationsTab from '@/views/profile/tabs/UserProfileNotificationsTab';
import UserProfileSecurityTab from '@/views/profile/tabs/UserProfileSecurityTab';
import UserProfileSubscriptionTab from '@/views/profile/tabs/UserProfileSubscriptionTab';
import { useEffect, useState } from 'react';
import { Card, CardBody, Col, Container, Nav, Row, Spinner } from 'react-bootstrap';
import { useSearchParams } from 'react-router';

const TAB_KEYS = ['subscription', 'security', 'account', 'notifications'] as const;
type TabKey = (typeof TAB_KEYS)[number];

function indexFromTabKey(k: string | null): number {
  if (!k) return 0;
  const idx = TAB_KEYS.indexOf(k as TabKey);
  return idx >= 0 ? idx : 0;
}

function profileHelpContext(tabIndex: number): DocsHelpContextKey {
  const key = TAB_KEYS[tabIndex] ?? 'subscription';
  if (key === 'subscription') return 'profile:subscription';
  if (key === 'security') return 'profile:security';
  if (key === 'account') return 'profile:account';
  return 'profile:notifications';
}

const UserProfilePage = () => {
  const { user, isLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabIndex = indexFromTabKey(searchParams.get('tab'));
  const [tab, setTab] = useState(tabIndex);

  useEffect(() => {
    setTab(indexFromTabKey(searchParams.get('tab')));
  }, [searchParams]);

  const setTabKey = (key: TabKey) => {
    const i = TAB_KEYS.indexOf(key);
    setTab(i);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', key);
        return next;
      },
      { replace: true },
    );
  };

  if (isLoading) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Profile" subtitle="Account" />
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" role="status" variant="primary">
            <span className="visually-hidden">Loading…</span>
          </Spinner>
        </div>
      </Container>
    );
  }

  if (!user) {
    return (
      <Container fluid>
        <PageBreadcrumb title="Profile" subtitle="Account" />
        <Card className="mt-3">
          <CardBody className="text-center py-5">
            <p className="text-muted mb-0">You need to be signed in to view your profile.</p>
          </CardBody>
        </Card>
      </Container>
    );
  }

  const title = user.name?.trim() || user.email || 'Profile';

  return (
    <Container fluid>
      <PageBreadcrumb title={title} subtitle="Account" titleEnd={<DocHelpButton contextKey={profileHelpContext(tab)} />} />
      <div className="d-flex justify-content-end align-items-center gap-2 mb-2">
        <ContactSupportButton category="account" context={{ sourceLabel: 'Profile' }} />
      </div>

      <Row className="justify-content-center">
        <Col xxl={12}>
          <Row>
            <Col xl={9}>
              <Card className="mb-3 shadow-sm">
                <CardBody className="pb-0 border-bottom border-light">
                  <Nav variant="underline" className="gap-3 flex-nowrap mb-0 flex-wrap">
                    {TAB_KEYS.map((key, i) => {
                      const { label, Icon } = USER_PROFILE_TAB_CONFIG[key];
                      return (
                        <Nav.Item key={key}>
                          <Nav.Link
                            active={tab === i}
                            href="#"
                            className="py-2 px-0"
                            onClick={(e) => {
                              e.preventDefault();
                              setTabKey(key);
                            }}
                          >
                            <TabNavLabel Icon={Icon}>{label}</TabNavLabel>
                          </Nav.Link>
                        </Nav.Item>
                      );
                    })}
                  </Nav>
                </CardBody>
                <CardBody className="pt-4 pb-4">
                  {tab === 0 && <UserProfileSubscriptionTab />}
                  {tab === 1 && <UserProfileSecurityTab />}
                  {tab === 2 && <UserProfileAccountSettingsTab />}
                  {tab === 3 && <UserProfileNotificationsTab />}
                </CardBody>
              </Card>
            </Col>

            <Col xl={3}>
              <UserProfileSidebarCard user={user} />
            </Col>
          </Row>
        </Col>
      </Row>
    </Container>
  );
};

export default UserProfilePage;
