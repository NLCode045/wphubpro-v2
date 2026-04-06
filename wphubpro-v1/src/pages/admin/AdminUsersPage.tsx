/**
 * Admin User Manager - List, search, and edit users
 * Styled like Sites page (DataTable layout)
 */
import React, { useState, useCallback } from 'react';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Icon from '@mui/material/Icon';
import SoftButton from 'components/SoftButton';
import SoftBox from 'components/SoftBox';
import SoftTypography from 'components/SoftTypography';
import SoftInput from 'components/SoftInput';
import Pagination from '@mui/material/Pagination';
import DataTableHeadCell from 'examples/Tables/DataTable/DataTableHeadCell';
import DataTableBodyCell from 'examples/Tables/DataTable/DataTableBodyCell';
import Footer from 'examples/Footer';
import { contentPageShellSx } from '../../theme/contentPaper';
import { useAdminUsersList, useAdminUsersUpdate, useAdminLoginAs, type AdminUser } from '../../domains/admin/useAdminUsers';
import { useToast } from '../../contexts/ToastContext';
import { iconButtonOnLightSurfaceSx } from '../../theme/detailPageStyles';

interface EditUserModalProps {
  user: AdminUser | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

function EditUserModal({ user, open, onClose, onSaved }: EditUserModalProps) {
  const { toast } = useToast();
  const updateMutation = useAdminUsersUpdate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
  const [isAdmin, setIsAdmin] = useState(false);

  React.useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setStatus(user.status);
      setIsAdmin(user.isAdmin);
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    const updates: Parameters<typeof updateMutation.mutateAsync>[0]['updates'] = {
      name: name.trim() || undefined,
      email: email.trim() || undefined,
      status,
      isAdmin,
    };
    try {
      await updateMutation.mutateAsync({
        userId: user.id,
        updates,
      });
      toast({ title: 'User updated', variant: 'success' });
      onSaved();
      onClose();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Could not update user',
        variant: 'destructive',
      });
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit user: {user.name}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
        <TextField
          variant="standard"
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          fullWidth
          size="small"
        />
        <TextField
          variant="standard"
          label="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          fullWidth
          size="small"
          type="email"
        />
        <TextField
          variant="standard"
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value as 'Active' | 'Inactive')}
          select
          fullWidth
          size="small"
        >
          <MenuItem value="Active">Active</MenuItem>
          <MenuItem value="Inactive">Inactive</MenuItem>
        </TextField>
        <FormControlLabel
          control={<Checkbox checked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)} />}
          label="Admin"
        />
      </DialogContent>
      <DialogActions>
        <SoftButton variant="text" color="secondary" onClick={onClose}>
          Cancel
        </SoftButton>
        <SoftButton variant="contained" color="primary" onClick={handleSave} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? 'Saving...' : 'Save'}
        </SoftButton>
      </DialogActions>
    </Dialog>
  );
}

const AdminUsersPage: React.FC = () => {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(25);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuUser, setMenuUser] = useState<AdminUser | null>(null);

  const { data, isLoading, isError, error, refetch } = useAdminUsersList({
    limit,
    offset: page * limit,
    search,
  });

  const loginAsMutation = useAdminLoginAs();

  const handleSearch = useCallback(() => {
    setSearch(searchInput.trim());
    setPage(0);
  }, [searchInput]);

  const handleEdit = (user: AdminUser) => {
    setEditUser(user);
    setEditModalOpen(true);
    setMenuAnchor(null);
    setMenuUser(null);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, user: AdminUser) => {
    setMenuAnchor(event.currentTarget);
    setMenuUser(user);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setMenuUser(null);
  };

  const handleLoginAs = async (userId: string) => {
    handleMenuClose();
    try {
      const token = await loginAsMutation.mutateAsync(userId);
      if (token) {
        toast({ title: 'Login-as token generated', variant: 'success' });
        navigator.clipboard?.writeText(token);
        toast({ title: 'Token copied to clipboard', variant: 'success' });
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Could not log in as user',
        variant: 'destructive',
      });
    }
  };

  const users = data?.users ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <>
      <EditUserModal
        user={editUser}
        open={editModalOpen}
        onClose={() => { setEditModalOpen(false); setEditUser(null); }}
        onSaved={() => refetch()}
      />

      <Menu
        id="user-actions-menu"
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={() => menuUser && handleEdit(menuUser)}>
          <ListItemIcon>
            <Icon fontSize="small">edit</Icon>
          </ListItemIcon>
          Bewerken
        </MenuItem>
        <MenuItem
          onClick={() => menuUser && handleLoginAs(menuUser.id)}
          disabled={loginAsMutation.isPending}
        >
          <ListItemIcon>
            <Icon fontSize="small">login</Icon>
          </ListItemIcon>
          Inloggen als
        </MenuItem>
      </Menu>

      <SoftBox sx={contentPageShellSx}>
        <Card>
          <SoftBox display="flex" justifyContent="space-between" alignItems="flex-start" p={3}>
            <SoftBox lineHeight={1}>
              <SoftTypography variant="h5" fontWeight="bold">
                User management
              </SoftTypography>
              <SoftTypography variant="button" fontWeight="regular" color="text">
                Manage users, roles and subscriptions.
              </SoftTypography>
            </SoftBox>
          </SoftBox>

          <SoftBox display="flex" justifyContent="space-between" alignItems="center" pt={1} px={3} pb={2} flexWrap="wrap" gap={2}>
            <SoftBox display="flex" alignItems="center">
              <TextField
                variant="standard"
                select
                size="small"
                value={limit}
                onChange={(e) => { setLimit(Number(e.target.value)); setPage(0); }}
                sx={{ width: 70, mr: 1 }}
              >
                <MenuItem value={10}>10</MenuItem>
                <MenuItem value={25}>25</MenuItem>
                <MenuItem value={50}>50</MenuItem>
                <MenuItem value={100}>100</MenuItem>
              </TextField>
              <SoftTypography variant="caption" color="secondary">
                entries per page
              </SoftTypography>
            </SoftBox>
            <SoftBox display="flex" alignItems="center" gap={2}>
              <SoftInput
                placeholder="Search..."
                value={searchInput}
                onChange={({ currentTarget }) => setSearchInput(currentTarget.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                size="small"
                sx={{ width: '12rem' }}
              />
              <SoftButton variant="contained" color="primary" size="small" onClick={handleSearch}>
                Search
              </SoftButton>
            </SoftBox>
          </SoftBox>

          {isLoading && (
            <SoftBox p={6} textAlign="center">
              <SoftTypography variant="button" color="secondary">Loading...</SoftTypography>
            </SoftBox>
          )}

          {isError && (
            <SoftBox p={4}>
              <SoftTypography variant="button" color="error">
                {error?.message || 'Error loading users.'}
              </SoftTypography>
            </SoftBox>
          )}

          {!isLoading && !isError && (
            <TableContainer sx={{ boxShadow: 'none' }}>
              <Table>
                <SoftBox component="thead">
                  <TableRow>
                    <DataTableHeadCell width="18%" pl={5} color="#4F5482">Name</DataTableHeadCell>
                    <DataTableHeadCell width="22%" pl={undefined} color="#4F5482">E-mail</DataTableHeadCell>
                    <DataTableHeadCell width="10%" pl={undefined} color="#4F5482">Role</DataTableHeadCell>
                    <DataTableHeadCell width="12%" pl={undefined} color="#4F5482">Plan</DataTableHeadCell>
                    <DataTableHeadCell width="10%" pl={undefined} color="#4F5482">Status</DataTableHeadCell>
                    <DataTableHeadCell width="12%" pl={undefined} color="#4F5482">Member since</DataTableHeadCell>
                    <DataTableHeadCell width="14%" pl={undefined} align="right" sorted="none" color="#4F5482">Actions</DataTableHeadCell>
                  </TableRow>
                </SoftBox>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4, borderBottom: 'none' }}>
                        <Icon sx={{ fontSize: 48, color: 'grey.400', mb: 1, display: 'block', mx: 'auto' }}>people</Icon>
                        <SoftTypography color="secondary">No users found</SoftTypography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((u, rowIndex) => (
                      <TableRow key={u.id} hover>
                        <DataTableBodyCell noBorder={rowIndex === users.length - 1}>{u.name}</DataTableBodyCell>
                        <DataTableBodyCell noBorder={rowIndex === users.length - 1}>{u.email}</DataTableBodyCell>
                        <DataTableBodyCell noBorder={rowIndex === users.length - 1}>{u.role}</DataTableBodyCell>
                        <DataTableBodyCell noBorder={rowIndex === users.length - 1}>{u.planName}</DataTableBodyCell>
                        <DataTableBodyCell noBorder={rowIndex === users.length - 1}>{u.status}</DataTableBodyCell>
                        <DataTableBodyCell noBorder={rowIndex === users.length - 1}>{u.joined}</DataTableBodyCell>
                        <DataTableBodyCell align="right" noBorder={rowIndex === users.length - 1}>
                          <IconButton
                            size="small"
                            onClick={(e) => handleMenuOpen(e, u)}
                            aria-controls={menuAnchor ? 'user-actions-menu' : undefined}
                            aria-haspopup="true"
                            aria-expanded={menuAnchor ? 'true' : undefined}
                            title="Actions"
                            sx={iconButtonOnLightSurfaceSx}
                          >
                            <Icon fontSize="small">more_vert</Icon>
                          </IconButton>
                        </DataTableBodyCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              <SoftBox
                display="flex"
                flexDirection={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                p={3}
              >
                <SoftBox mb={{ xs: totalPages > 1 ? 3 : 0, sm: 0 }}>
                  <SoftTypography variant="button" color="secondary" fontWeight="regular">
                    Showing {total === 0 ? 0 : page * limit + 1} to {Math.min((page + 1) * limit, total)} of {total} entries
                  </SoftTypography>
                </SoftBox>
                <SoftBox display="flex" alignItems="center" gap={2} ml="auto" mb={{ xs: 3, sm: 0 }}>
                  {totalPages > 1 && (
                    <Pagination
                      count={totalPages}
                      page={page + 1}
                      onChange={(_, p) => setPage(p - 1)}
                      color="primary"
                      size="small"
                      showFirstButton
                      showLastButton
                    />
                  )}
                </SoftBox>
              </SoftBox>
            </TableContainer>
          )}
        </Card>
      </SoftBox>
      <Footer company={{ href: 'https://wphub.pro', name: 'WPHub.PRO' }} links={[]} />
    </>
  );
};

export default AdminUsersPage;
