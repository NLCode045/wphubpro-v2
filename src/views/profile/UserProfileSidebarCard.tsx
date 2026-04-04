import { type PrefsRecord, parseProfilePrefs } from '@/domains/profile/profilePrefs';
import { avatars } from '@/services/appwrite';
import type { User } from '@/types';
import { useMemo } from 'react';
import { Card, CardBody, CardHeader, CardTitle } from 'react-bootstrap';
import { MdFlashOff, MdFlashOn } from 'react-icons/md';
import { TbExternalLink, TbMail, TbWorld } from 'react-icons/tb';

type UserProfileSidebarCardProps = {
  user: User;
};

function formatJoinedAt(user: User): string | null {
  const raw = user.$createdAt;
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { dateStyle: 'medium' });
}

function userStatusActive(user: User): boolean {
  const s = user.status;
  if (typeof s === 'boolean') return s;
  if (typeof s === 'string') return s.toLowerCase() === 'true' || s.toLowerCase() === 'active';
  return true;
}

function normalizeWebsiteUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return '';
  return t.startsWith('http://') || t.startsWith('https://') ? t : `https://${t}`;
}

const UserProfileSidebarCard = ({ user }: UserProfileSidebarCardProps) => {
  const displayName = user.name?.trim() || user.email || 'Account';
  const active = userStatusActive(user);
  const roleLabel = user.isAdmin ? 'Administrator' : 'Member';
  const joined = formatJoinedAt(user);
  const website = parseProfilePrefs((user.prefs ?? null) as PrefsRecord | null).website?.trim() || '';
  const websiteHref = website ? normalizeWebsiteUrl(website) : '';

  const initialsSrc = useMemo(() => {
    try {
      return avatars.getInitials(displayName, 128, 128);
    } catch {
      return null;
    }
  }, [displayName]);

  return (
    <div className="position-sticky align-self-start z-3" style={{ top: '0.75rem' }}>
      <Card className="bg-dark text-white border-secondary border-opacity-25 shadow">
        <CardHeader className="d-flex flex-wrap align-items-start justify-content-between gap-2 border-secondary border-opacity-25 bg-transparent text-white">
          <CardTitle as="h4" className="mb-0 text-white">
            Profile details
          </CardTitle>
          <div className="d-flex flex-column align-items-end text-end flex-shrink-0 ms-auto">
            <div className="d-flex align-items-center gap-1 flex-wrap justify-content-end">
              {active ? (
                <MdFlashOn style={{ fontSize: '1.35rem', color: '#22c55e' }} aria-hidden />
              ) : (
                <MdFlashOff style={{ fontSize: '1.35rem', color: 'rgba(255,255,255,0.45)' }} aria-hidden />
              )}
              <span className="fs-xs text-white fw-medium">{active ? 'Active' : 'Inactive'}</span>
            </div>
          </div>
        </CardHeader>
        <CardBody className="pt-0">
          <div className="d-flex align-items-center mb-4">
            <div className="me-2 flex-shrink-0">
              <span
                className="rounded-circle bg-white d-inline-flex align-items-center justify-content-center flex-shrink-0 shadow-sm overflow-hidden"
                style={{ width: 48, height: 48, lineHeight: 0 }}
                aria-hidden
              >
                {initialsSrc ? (
                  <img src={initialsSrc} alt="" width={48} height={48} className="d-block" style={{ objectFit: 'cover' }} />
                ) : (
                  <span className="text-dark fw-semibold fs-sm">{displayName.slice(0, 1).toUpperCase()}</span>
                )}
              </span>
            </div>
            <div className="min-w-0 flex-grow-1">
              <h5 className="mb-1 text-truncate text-white" title={displayName}>
                {displayName}
              </h5>
              <p className="text-white-50 mb-0 fs-xs text-break">User ID · {user.$id}</p>
            </div>
          </div>

          <ul className="list-unstyled text-white-50 mb-0">
            {user.email ? (
              <li className="mb-3">
                <div className="d-flex align-items-start gap-2">
                  <div className="avatar-xs avatar-img-size fs-24 flex-shrink-0">
                    <span className="avatar-title bg-white bg-opacity-10 text-white fs-sm rounded-circle d-inline-flex align-items-center justify-content-center border border-white border-opacity-10">
                      <TbMail />
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="fs-xxs text-uppercase text-white-50 mb-0 fw-semibold">Email</p>
                    <span className="link-light fw-medium text-break d-block">{user.email}</span>
                  </div>
                </div>
              </li>
            ) : null}
            {websiteHref ? (
              <li className="mb-0">
                <div className="d-flex align-items-start gap-2">
                  <div className="avatar-xs avatar-img-size fs-24 flex-shrink-0">
                    <span className="avatar-title bg-white bg-opacity-10 text-white fs-sm rounded-circle d-inline-flex align-items-center justify-content-center border border-white border-opacity-10">
                      <TbWorld />
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="fs-xxs text-uppercase text-white-50 mb-0 fw-semibold">Website</p>
                    <a
                      href={websiteHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link-light link-offset-1 fw-medium text-break d-inline-flex align-items-center gap-1"
                    >
                      <TbExternalLink className="flex-shrink-0" aria-hidden />
                      {website}
                    </a>
                  </div>
                </div>
              </li>
            ) : (
              <li className="mb-0">
                <p className="fs-xxs text-uppercase text-white-50 mb-1 fw-semibold">Website</p>
                <span className="text-white-50 fs-xs">—</span>
              </li>
            )}
          </ul>

          <hr className="my-3 border-secondary border-opacity-50" />

          <div className="d-flex flex-wrap gap-2 mb-3">
            <span className={`badge ${user.isAdmin ? 'badge-soft-warning' : 'badge-soft-light'} badge-label text-dark`}>
              {roleLabel}
            </span>
          </div>

          {joined ? (
            <div className="rounded bg-white bg-opacity-10 border border-white border-opacity-10 p-3">
              <p className="fs-xxs text-uppercase text-white-50 fw-semibold mb-1">Member since</p>
              <p className="mb-0 small text-white fw-medium">{joined}</p>
            </div>
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
};

export default UserProfileSidebarCard;
