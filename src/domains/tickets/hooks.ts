import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth';
import { executeFunction } from '../../integrations/appwrite/executeFunction';
import type { Ticket, TicketMessage } from '../../types';

interface TicketDoc {
  $id: string;
  user_id: string;
  subject: string;
  status: string;
  priority: string;
  category?: string;
  site_id?: string;
  $createdAt: string;
  $updatedAt: string;
}

interface TicketMessageDoc {
  $id: string;
  ticket_id: string;
  user_id: string;
  body: string;
  is_staff: boolean;
  $createdAt: string;
}

function mapTicket(doc: TicketDoc): Ticket {
  return {
    $id: doc.$id,
    userId: doc.user_id,
    subject: doc.subject,
    status: doc.status as Ticket['status'],
    priority: doc.priority as Ticket['priority'],
    category: doc.category ?? undefined,
    siteId: doc.site_id ?? undefined,
    $createdAt: doc.$createdAt,
    $updatedAt: doc.$updatedAt,
  };
}

function mapMessage(doc: TicketMessageDoc): TicketMessage {
  return {
    $id: doc.$id,
    ticketId: doc.ticket_id,
    userId: doc.user_id,
    body: doc.body,
    isStaff: doc.is_staff,
    $createdAt: doc.$createdAt,
  };
}

export const useTickets = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['tickets', user?.$id],
    queryFn: async () => {
      const res = await executeFunction<{ tickets: TicketDoc[]; total: number }>('tickets', {
        action: 'list',
      });
      return {
        tickets: (res?.tickets ?? []).map(mapTicket),
        total: res?.total ?? 0,
      };
    },
    enabled: !!user,
  });
};

export const useAdminTickets = () => {
  const { user, isAdmin } = useAuth();
  return useQuery({
    queryKey: ['adminTickets'],
    queryFn: async () => {
      const res = await executeFunction<{ tickets: TicketDoc[]; total: number }>('tickets', {
        action: 'adminList',
      });
      return {
        tickets: (res?.tickets ?? []).map(mapTicket),
        total: res?.total ?? 0,
      };
    },
    enabled: !!user && !!isAdmin,
  });
};

export const useTicket = (ticketId: string | undefined) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['ticket', ticketId, user?.$id],
    queryFn: async () => {
      const res = await executeFunction<{ ticket: TicketDoc; messages: TicketMessageDoc[] }>(
        'tickets',
        { action: 'get', ticketId }
      );
      return {
        ticket: mapTicket(res!.ticket),
        messages: (res?.messages ?? []).map(mapMessage),
      };
    },
    enabled: !!user && !!ticketId,
  });
};

export const useCreateTicket = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      subject: string;
      body?: string;
      priority?: Ticket['priority'];
      category?: string;
      siteId?: string;
      targetUserId?: string;
    }) =>
      executeFunction<{ ticket: TicketDoc }>('tickets', {
        action: 'create',
        ...data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
};

export const useAddTicketMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { ticketId: string; body: string }) =>
      executeFunction('tickets', { action: 'addMessage', ...data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket', variables.ticketId] });
      queryClient.invalidateQueries({ queryKey: ['adminTickets'] });
    },
  });
};

export const useUpdateTicketStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { ticketId: string; status: Ticket['status'] }) =>
      executeFunction('tickets', { action: 'updateStatus', ...data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['adminTickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket', variables.ticketId] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
};
