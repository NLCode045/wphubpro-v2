import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth';
import { executeFunction } from '../../integrations/appwrite/executeFunction';
import { APPWRITE_FUNCTION_IDS } from '../../services/appwrite';
import type { Ticket, TicketMessage } from '../../types';

const TICKETS_FN = APPWRITE_FUNCTION_IDS.TICKETS;

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
      const res = await executeFunction<{ tickets: TicketDoc[]; total: number }>(TICKETS_FN, {
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
      const res = await executeFunction<{ tickets: TicketDoc[]; total: number }>(TICKETS_FN, {
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
        TICKETS_FN,
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
      executeFunction<{ ticket: TicketDoc }>(TICKETS_FN, {
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
      executeFunction(TICKETS_FN, { action: 'addMessage', ...data }),
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
      executeFunction(TICKETS_FN, { action: 'updateStatus', ...data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['adminTickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket', variables.ticketId] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
};
