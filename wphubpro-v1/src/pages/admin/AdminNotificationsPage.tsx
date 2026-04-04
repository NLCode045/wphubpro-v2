import React, { useState } from 'react';
import Card from '@mui/material/Card';
import TextField from '@mui/material/TextField';
import SoftInput from 'components/SoftInput';
import MenuItem from '@mui/material/MenuItem';
import SoftBox from 'components/SoftBox';
import SoftTypography from 'components/SoftTypography';
import SoftButton from 'components/SoftButton';
import Footer from 'examples/Footer';
import { contentPageShellSx } from '../../theme/contentPaper';
import { executeFunction } from '../../integrations/appwrite/executeFunction';
import { useToast } from '../../contexts/ToastContext';
import type { NotificationType } from '../../types';

const AdminNotificationsPage: React.FC = () => {
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState<NotificationType>('platform');
  const [targetUserIds, setTargetUserIds] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      toast({ title: 'Please fill in title and message', variant: 'destructive' });
      return;
    }
    setIsSending(true);
    try {
      const ids = targetUserIds.trim() ? targetUserIds.trim().split(/\s+/).filter(Boolean) : [];
      await executeFunction('notifications', {
        action: 'send',
        title: title.trim(),
        body: body.trim(),
        type,
        targetUserIds: ids,
      });
      toast({ title: 'Notification sent', variant: 'success' });
      setTitle('');
      setBody('');
      setTargetUserIds('');
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Could not send notification',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <SoftBox sx={contentPageShellSx}>
        <SoftTypography variant="h4" fontWeight="bold" mb={2}>
          Send platform notifications
        </SoftTypography>
        <Card>
          <SoftBox component="form" onSubmit={handleSend} p={3} display="flex" flexDirection="column" gap={2}>
            <SoftBox>
              <SoftTypography variant="caption" fontWeight="medium" color="text" display="block" mb={0.5}>Title</SoftTypography>
              <SoftInput value={title} onChange={(e) => setTitle(e.target.value)} required fullWidth size="small" />
            </SoftBox>
            <TextField
              variant="standard"
              label="Type"
              value={type}
              onChange={(e) => setType(e.target.value as NotificationType)}
              select
              fullWidth
              size="small"
            >
              <MenuItem value="platform">Platform</MenuItem>
              <MenuItem value="site_connection">Site error</MenuItem>
              <MenuItem value="plugin_update">Plugin update</MenuItem>
              <MenuItem value="theme_update">Theme update</MenuItem>
              <MenuItem value="site_report">Site report</MenuItem>
              <MenuItem value="subscription">Subscription</MenuItem>
            </TextField>
            <TextField
              variant="standard"
              label="Message"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              multiline
              rows={5}
              required
              fullWidth
              size="small"
            />
            <SoftBox>
              <SoftTypography variant="caption" fontWeight="medium" color="text" display="block" mb={0.5}>User IDs (optional, empty = all users)</SoftTypography>
              <SoftInput value={targetUserIds} onChange={(e) => setTargetUserIds(e.target.value)} placeholder="Space-separated user IDs" fullWidth size="small" />
            </SoftBox>
            <SoftButton type="submit" variant="gradient" color="info" disabled={isSending}>
              {isSending ? 'Sending...' : 'Send notification'}
            </SoftButton>
          </SoftBox>
        </Card>
      </SoftBox>
      <Footer company={{ href: 'https://wphub.pro', name: 'WPHub.PRO' }} links={[]} />
    </>
  );
};

export default AdminNotificationsPage;
