import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '@mui/material/Card';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import SoftBox from 'components/SoftBox';
import SoftInput from 'components/SoftInput';
import SoftTypography from 'components/SoftTypography';
import SoftButton from 'components/SoftButton';
import Footer from 'examples/Footer';
import { contentPageShellSx, contentPaperSurfaceSx, contentPaperPageTitleSx } from '../theme/contentPaper';
import { useCreateTicket } from '../domains/tickets';
import { useToast } from '../contexts/ToastContext';
import { ROUTE_PATHS } from '../config/routePaths';
import type { TicketPriority } from '../types';

const CreateTicketPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const createTicket = useCreateTicket();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('medium');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) {
      toast({ title: 'Subject required', variant: 'destructive' });
      return;
    }
    try {
      const res = await createTicket.mutateAsync({ subject: subject.trim(), body: body.trim(), priority });
      toast({ title: 'Ticket created', variant: 'success' });
      navigate(ROUTE_PATHS.TICKET_DETAIL.replace(':id', res.ticket.$id));
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Could not create ticket',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <SoftBox sx={contentPageShellSx}>
        <SoftTypography sx={{ ...contentPaperPageTitleSx, mb: 2 }}>
          New ticket
        </SoftTypography>

        <Card sx={contentPaperSurfaceSx}>
          <SoftBox component="form" onSubmit={handleSubmit} p={3} display="flex" flexDirection="column" gap={2}>
            <SoftBox>
              <SoftTypography variant="caption" fontWeight="medium" color="text" display="block" mb={0.5}>Subject</SoftTypography>
              <SoftInput value={subject} onChange={(e) => setSubject(e.target.value)} required fullWidth size="small" />
            </SoftBox>
            <TextField
              variant="standard"
              label="Priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as TicketPriority)}
              select
              fullWidth
              size="small"
            >
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Normal</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="urgent">Urgent</MenuItem>
            </TextField>
            <SoftBox>
              <SoftTypography variant="caption" fontWeight="medium" color="text" display="block" mb={0.5}>Message</SoftTypography>
              <SoftInput value={body} onChange={(e) => setBody(e.target.value)} multiline rows={5} fullWidth size="small" />
            </SoftBox>
            <SoftBox display="flex" gap={1} mt={1}>
              <SoftButton type="submit" variant="gradient" color="info" disabled={createTicket.isPending}>
                {createTicket.isPending ? 'Creating...' : 'Create ticket'}
              </SoftButton>
              <SoftButton variant="outlined" color="info" onClick={() => navigate(ROUTE_PATHS.SUPPORT_TICKETS)}>
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

export default CreateTicketPage;
