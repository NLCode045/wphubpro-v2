import { useAuth } from '@/domains/auth';
import { useAddTicketMessage } from '@/domains/tickets';
import type { TicketMessage } from '@/types';
import { useState, type FormEvent } from 'react';
import { Button, Card, CardHeader, Spinner } from 'react-bootstrap';
import SimpleBar from 'simplebar-react';
import { TbClock, TbSend2 } from 'react-icons/tb';

type Props = {
  ticketId: string;
  messages: TicketMessage[];
};

export function SupportTicketChatCard({ ticketId, messages }: Props) {
  const { user } = useAuth();
  const add = useAddTicketMessage();
  const [input, setInput] = useState('');

  const handleSend = (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || !user) return;
    add.mutate(
      { ticketId, body: text },
      {
        onSuccess: () => setInput(''),
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <h4 className="card-title mb-0">Conversation</h4>
      </CardHeader>

      <SimpleBar className="card-body py-0" style={{ height: '380px' }} id="ticket-chat">
        {messages.map((m) => {
          const mine = m.userId === user?.$id;
          const t = new Date(m.$createdAt);
          const timeStr = t.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
          return (
            <div
              key={m.$id}
              className={`d-flex align-items-start gap-2 my-3 chat-item${mine ? ' text-end justify-content-end' : ''}`}
            >
              {!mine && (
                <span className="avatar-xs rounded-circle bg-secondary-subtle d-inline-flex align-items-center justify-content-center flex-shrink-0 mt-1 small">
                  {m.isStaff ? 'S' : 'U'}
                </span>
              )}
              <div>
                <div
                  className={`chat-message py-2 px-3 rounded ${mine ? 'bg-info-subtle' : m.isStaff ? 'bg-warning-subtle' : 'bg-light'}`}
                >
                  {m.body}
                </div>
                <div className="text-muted fs-xs mt-1 d-inline-flex align-items-center gap-1">
                  <TbClock /> {timeStr}
                  {m.isStaff ? <span className="ms-1">· Staff</span> : null}
                </div>
              </div>
            </div>
          );
        })}
      </SimpleBar>

      <div className="card-footer bg-body-secondary border-top border-dashed border-bottom-0">
        <form className="d-flex gap-2" onSubmit={handleSend}>
          <div className="app-search flex-grow-1">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="form-control bg-light-subtle border-light"
              placeholder="Write a reply…"
              disabled={add.isPending}
            />
          </div>
          <Button type="submit" variant="primary" disabled={add.isPending || !input.trim()}>
            {add.isPending ? <Spinner animation="border" size="sm" /> : <TbSend2 />}
          </Button>
        </form>
      </div>
    </Card>
  );
}
