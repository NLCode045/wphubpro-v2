import type { AdminUser } from '@/domains/admin/useAdminUsers';
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownToggle,
  Table,
} from 'react-bootstrap';
import { TbDotsVertical, TbUserShare } from 'react-icons/tb';

function initials(name: string, email: string): string {
  const s = name.trim() || email;
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return s.substring(0, 2).toUpperCase() || 'U';
}

type AdminUsersTableProps = {
  users: AdminUser[];
  onEdit: (user: AdminUser) => void;
  onImpersonate: (userId: string) => void;
  impersonateBusyId: string | null;
};

const AdminUsersTable = ({
  users,
  onEdit,
  onImpersonate,
  impersonateBusyId,
}: AdminUsersTableProps) => {
  return (
    <div className="table-responsive border rounded">
      <Table hover className="table table-custom table-centered table-nowrap mb-0 align-middle">
        <thead className="bg-light bg-opacity-25 thead-sm">
          <tr className="text-uppercase fs-xxs">
            <th>User</th>
            <th>Email</th>
            <th>Role</th>
            <th>Plan</th>
            <th>Status</th>
            <th>Joined</th>
            <th className="text-end">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const roleVariant = user.role === 'Admin' ? 'primary' : 'secondary';
            const statusVariant = user.status === 'Active' ? 'success' : 'warning';
            return (
              <tr key={user.id}>
                <td>
                  <div className="d-flex align-items-center gap-2">
                    {user.avatar ? (
                      <img src={user.avatar} alt="" className="rounded-circle flex-shrink-0" width={36} height={36} />
                    ) : (
                      <div
                        className="rounded-circle bg-primary bg-opacity-10 text-primary flex-shrink-0 d-inline-flex align-items-center justify-content-center fw-semibold"
                        style={{ width: 36, height: 36, fontSize: '0.75rem' }}
                      >
                        {initials(user.name, user.email)}
                      </div>
                    )}
                    <span className="fw-medium text-truncate" style={{ maxWidth: '12rem' }} title={user.name}>
                      {user.name}
                    </span>
                  </div>
                </td>
                <td>
                  <span className="text-muted fs-xs text-truncate d-inline-block" style={{ maxWidth: '14rem' }} title={user.email}>
                    {user.email}
                  </span>
                </td>
                <td>
                  <span className={`badge bg-${roleVariant}-subtle text-${roleVariant}`}>{user.role}</span>
                </td>
                <td className="fs-xs text-muted">{user.planName}</td>
                <td>
                  <span className={`badge bg-${statusVariant}-subtle text-${statusVariant}`}>{user.status}</span>
                </td>
                <td className="text-muted fs-xs text-nowrap">{user.joined}</td>
                <td className="text-end">
                  <div className="d-inline-flex align-items-center gap-1">
                    <button
                      type="button"
                      className="btn btn-default btn-icon btn-sm text-muted"
                      aria-label="Log in as user"
                      title="Log in as user"
                      disabled={impersonateBusyId !== null}
                      onClick={() => onImpersonate(user.id)}
                    >
                      {impersonateBusyId === user.id ? (
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden />
                      ) : (
                        <TbUserShare className="fs-lg" />
                      )}
                    </button>
                    <Dropdown align="end">
                      <DropdownToggle variant="link" className="p-1 text-muted link-reset" aria-label="User actions">
                        <TbDotsVertical className="fs-lg" />
                      </DropdownToggle>
                      <DropdownMenu>
                        <DropdownItem as="button" type="button" onClick={() => onEdit(user)}>
                          Edit
                        </DropdownItem>
                      </DropdownMenu>
                    </Dropdown>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </div>
  );
};

export default AdminUsersTable;
