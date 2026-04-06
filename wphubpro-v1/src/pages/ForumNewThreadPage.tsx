import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Card from '@mui/material/Card';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Icon from '@mui/material/Icon';
import SoftBox from 'components/SoftBox';
import SoftTypography from 'components/SoftTypography';
import SoftButton from 'components/SoftButton';
import Footer from 'examples/Footer';
import { contentPageShellSx } from '../theme/contentPaper';
import { useForumCategories, useCreateForumThread } from '../domains/forum';
import { useToast } from '../contexts/ToastContext';
import { ROUTE_PATHS } from '../config/routePaths';

const ForumNewThreadPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const categoryKey = searchParams.get('category');
  const { toast } = useToast();
  const { data: categories } = useForumCategories();
  const createThread = useCreateForumThread();
  const [categoryId, setCategoryId] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const cats = categories ?? [];
  const preselected = categoryKey ? cats.find((c: { key: string }) => c.key === categoryKey) : null;
  const effectiveCategoryId = categoryId || preselected?.$id || (cats[0]?.$id ?? '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim() || !effectiveCategoryId) {
      toast({ title: 'Vul alle velden in', variant: 'destructive' });
      return;
    }
    try {
      const res = await createThread.mutateAsync({
        categoryId: effectiveCategoryId,
        title: title.trim(),
        body: body.trim(),
      });
      toast({ title: 'Discussie aangemaakt', variant: 'success' });
      navigate(ROUTE_PATHS.FORUM_THREAD.replace(':id', res.thread.$id));
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Could not create discussion',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <SoftBox sx={contentPageShellSx}>
        <SoftBox display="flex" alignItems="center" gap={1} mb={2}>
          <SoftButton size="small" variant="text" onClick={() => navigate(ROUTE_PATHS.FORUM)} startIcon={<Icon>arrow_back</Icon>}>
            Forum
          </SoftButton>
        </SoftBox>
        <SoftTypography variant="h4" fontWeight="bold" mb={2}>
          Nieuwe discussie
        </SoftTypography>

        <Card>
          <SoftBox component="form" onSubmit={handleSubmit} p={3} display="flex" flexDirection="column" gap={2}>
            <TextField
              variant="standard"
              label="Categorie"
              value={effectiveCategoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              select
              fullWidth
              size="small"
              required
            >
              {cats.map((c: { $id: string; name: string }) => (
                <MenuItem key={c.$id} value={c.$id}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
            <SoftBox>
              <SoftTypography variant="caption" fontWeight="medium" color="text" display="block" mb={0.5}>Title</SoftTypography>
              <SoftInput value={title} onChange={(e) => setTitle(e.target.value)} required fullWidth size="small" />
            </SoftBox>
            <SoftBox>
              <SoftTypography variant="caption" fontWeight="medium" color="text" display="block" mb={0.5}>Message</SoftTypography>
              <SoftInput value={body} onChange={(e) => setBody(e.target.value)} multiline rows={5} required fullWidth size="small" />
            </SoftBox>
            <SoftBox display="flex" gap={1} mt={1}>
              <SoftButton type="submit" variant="gradient" color="info" disabled={createThread.isPending}>
                {createThread.isPending ? 'Creating...' : 'Create discussion'}
              </SoftButton>
              <SoftButton variant="outlined" color="info" onClick={() => navigate(ROUTE_PATHS.FORUM)}>
                Cancel
              </SoftButton>
            </SoftBox>
          </SoftBox>
        </Card>
      </SoftBox>
      <Footer company={{ href: 'https://wphub.pro', name: 'WPHub.PRO' }} links={[]} />
    </>
  );
};

export default ForumNewThreadPage;
